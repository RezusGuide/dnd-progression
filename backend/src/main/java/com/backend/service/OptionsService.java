package com.backend.service;

import com.backend.entity.OptionOverride;
import com.backend.entity.UnlockFlag;
import com.backend.exception.ApiException;
import com.backend.repository.OptionOverrideRepository;
import com.backend.repository.UnlockFlagRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Which races and classes the campaign allows. The status comes from
 * data/races.json / classes.json; a row in option_override wins over it,
 * and an "unlockable" entry whose unlock_flag is open counts as "allowed".
 *
 * Players only ever see allowed and unlockable entries, and never the
 * unlock key - what a flag means is the GM's secret (UnlockFlag#gmLabel).
 */
@Service
@RequiredArgsConstructor
public class OptionsService {

    public static final String RACE = "RACE";
    public static final String CLASS = "CLASS";

    public static final String ALLOWED = "allowed";
    public static final String UNLOCKABLE = "unlockable";
    public static final String NPC_ONLY = "npc_only";
    // "Своя раса": a data row like any other, hidden until the GM allows it.
    public static final String CUSTOM_RACE = "CUSTOM";
    public static final Set<String> STATUSES = Set.of(ALLOWED, UNLOCKABLE, "undecided", "closed", "npc_only");

    private final DataRegistry data;
    private final OptionOverrideRepository overrideRepository;
    private final UnlockFlagRepository flagRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static String fileFor(String kind) {
        return CLASS.equals(kind) ? "classes" : "races";
    }

    /** RACE / CLASS from a path segment ("race", "classes"...); 400 otherwise. */
    public static String kindOf(String raw) {
        String k = raw == null ? "" : raw.strip().toUpperCase();
        if (k.startsWith("RACE")) return RACE;
        if (k.startsWith("CLASS")) return CLASS;
        throw ApiException.badRequest("Неизвестный раздел справочника.");
    }

    /** Creates a flag row for every unlock key in the data that has none yet. */
    @Transactional
    public void ensureFlags() {
        Set<String> keys = new LinkedHashSet<>();
        for (String file : List.of("races", "classes")) {
            for (JsonNode e : data.list(file)) {
                if (e.hasNonNull("unlock")) keys.add(e.get("unlock").asText());
            }
        }
        for (String key : keys) {
            if (!flagRepository.existsById(key)) {
                flagRepository.save(UnlockFlag.builder().key(key).unlocked(false).build());
            }
        }
    }

    // ── Effective status ──

    private Map<String, String> overrides(String kind) {
        return overrideRepository.findAll().stream()
                .filter(o -> kind.equals(o.getKind()))
                .collect(Collectors.toMap(OptionOverride::getKey, OptionOverride::getStatus, (a, b) -> b));
    }

    private Set<String> openFlags() {
        return flagRepository.findAll().stream()
                .filter(UnlockFlag::isUnlocked)
                .map(UnlockFlag::getKey)
                .collect(Collectors.toSet());
    }

    private static String baseStatus(JsonNode entry, Map<String, String> overrides) {
        String key = entry.get("key").asText();
        return overrides.getOrDefault(key, entry.path("status").asText(ALLOWED));
    }

    private static String effective(JsonNode entry, String base, Set<String> openFlags) {
        if (UNLOCKABLE.equals(base) && entry.hasNonNull("unlock") && openFlags.contains(entry.get("unlock").asText())) {
            return ALLOWED;
        }
        return base;
    }

    /**
     * True when this race / class may be picked in the wizard right now.
     * The GM may also pick classes marked "только для НИП".
     */
    @Transactional(readOnly = true)
    public boolean isAllowed(String kind, String key, boolean gm) {
        JsonNode entry = data.find(fileFor(kind), key).orElse(null);
        if (entry == null) return false;
        String status = effective(entry, baseStatus(entry, overrides(kind)), openFlags());
        return ALLOWED.equals(status) || (gm && CLASS.equals(kind) && NPC_ONLY.equals(status));
    }

    /**
     * GET /api/data/races|classes. Players get allowed and unlockable entries
     * only, with the effective status and no unlock key; the GM gets every
     * entry with its effective status.
     */
    @Transactional(readOnly = true)
    public String dataJson(String file, boolean gm) {
        String kind = "classes".equals(file) ? CLASS : RACE;
        Map<String, String> overrides = overrides(kind);
        Set<String> open = openFlags();
        ArrayNode out = objectMapper.createArrayNode();
        for (JsonNode entry : data.list(file)) {
            String status = effective(entry, baseStatus(entry, overrides), open);
            if (!gm && !ALLOWED.equals(status) && !UNLOCKABLE.equals(status)) continue;
            ObjectNode copy = entry.deepCopy();
            copy.put("status", status);
            if (!gm) copy.remove("unlock");
            out.add(copy);
        }
        try {
            return objectMapper.writeValueAsString(out);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    // ── GM panel ──

    /** Everything the "Справочник" section shows. */
    @Transactional(readOnly = true)
    public Map<String, Object> adminView() {
        Set<String> open = openFlags();
        Map<String, Object> out = new LinkedHashMap<>();
        Map<String, List<String>> byFlag = new HashMap<>();
        for (String kind : List.of(RACE, CLASS)) {
            Map<String, String> overrides = overrides(kind);
            List<Map<String, Object>> rows = new ArrayList<>();
            for (JsonNode e : data.list(fileFor(kind))) {
                String key = e.get("key").asText();
                String base = baseStatus(e, overrides);
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("key", key);
                row.put("nameRu", e.path("nameRu").asText(key));
                row.put("source", e.path("source").asText(null));
                row.put("srd", e.path("srd").asBoolean(false));
                row.put("defaultStatus", e.path("status").asText(ALLOWED));
                row.put("status", base);
                row.put("overridden", overrides.containsKey(key));
                row.put("effectiveStatus", effective(e, base, open));
                String unlock = e.hasNonNull("unlock") ? e.get("unlock").asText() : null;
                row.put("unlock", unlock);
                if (unlock != null) byFlag.computeIfAbsent(unlock, k -> new ArrayList<>()).add(row.get("nameRu").toString());
                rows.add(row);
            }
            out.put(RACE.equals(kind) ? "races" : "classes", rows);
        }
        List<Map<String, Object>> flags = new ArrayList<>();
        for (UnlockFlag f : flagRepository.findAll()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("key", f.getKey());
            row.put("gmLabel", f.getGmLabel());
            row.put("unlocked", f.isUnlocked());
            row.put("options", byFlag.getOrDefault(f.getKey(), List.of()));
            flags.add(row);
        }
        out.put("flags", flags);
        return out;
    }

    /** Sets a status; the JSON default removes the override instead. */
    @Transactional
    public Map<String, Object> setStatus(String rawKind, String key, String status) {
        String kind = kindOf(rawKind);
        JsonNode entry = data.find(fileFor(kind), key)
                .orElseThrow(() -> ApiException.notFound("В справочнике нет такой записи."));
        if (status == null || !STATUSES.contains(status) || (NPC_ONLY.equals(status) && RACE.equals(kind))) {
            throw ApiException.badRequest("Неизвестный статус.");
        }
        OptionOverride row = overrideRepository.findByKindAndKey(kind, key).orElse(null);
        if (status.equals(entry.path("status").asText(ALLOWED))) {
            if (row != null) overrideRepository.delete(row);
        } else if (row != null) {
            row.setStatus(status);
            overrideRepository.save(row);
        } else {
            overrideRepository.save(OptionOverride.builder().kind(kind).key(key).status(status).build());
        }
        return adminView();
    }

    @Transactional
    public Map<String, Object> setFlag(String key, Boolean unlocked, String gmLabel) {
        UnlockFlag flag = flagRepository.findById(key)
                .orElseThrow(() -> ApiException.notFound("Такого условия нет."));
        if (unlocked != null) flag.setUnlocked(unlocked);
        if (gmLabel != null) flag.setGmLabel(gmLabel.isBlank() ? null : gmLabel.strip());
        flagRepository.save(flag);
        return adminView();
    }
}
