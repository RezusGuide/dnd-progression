package com.backend.service;

import com.backend.dto.ChestContents;
import com.backend.dto.ChestRewardRequest;
import com.backend.dto.ChestRewardResponse;
import com.backend.dto.InventoryItemResponse;
import com.backend.entity.ApprovalStatus;
import com.backend.entity.Character;
import com.backend.entity.ChestReward;
import com.backend.entity.InventoryItem;
import com.backend.entity.ItemTemplate;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.repository.CharacterRepository;
import com.backend.repository.ChestRewardRepository;
import com.backend.repository.InventoryItemRepository;
import com.backend.repository.ItemTemplateRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Сундучок (docs/zlatopryady/prompts/07-chest.md): rewards from the GM,
 * opening them (with an optional riddle that bites), the inventory and the
 * GM's item library. Errors are Russian ApiExceptions.
 */
@Service
@RequiredArgsConstructor
public class ChestService {

    public static final Set<String> COINS = Set.of("cp", "sp", "ep", "gp", "pp");
    public static final int LOCK_MINUTES = 10;
    public static final int KEEP_WRONG_ANSWERS = 10;
    public static final int WRONG_ANSWER_LENGTH = 100;

    private final ChestRewardRepository rewardRepository;
    private final InventoryItemRepository itemRepository;
    private final ItemTemplateRepository templateRepository;
    private final CharacterRepository characterRepository;
    private final MagicData magic;
    // Classic Jackson 2 for the TEXT column, as elsewhere in this codebase.
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── The riddle ──

    /** Lower case, trimmed, ё → е. «Ёлка » and «елка» are the same answer. */
    public static String normalize(String answer) {
        return answer == null ? "" : answer.strip().toLowerCase(Locale.ROOT).replace('ё', 'е');
    }

    public static String hashAnswer(String answer) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(normalize(answer).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    // ── Opening ──

    /** What happened on POST .../open: opened, bitten (409) or still locked (423). */
    // spared: the chest bit with HP_1 but there were no hit points left to take.
    public record OpenOutcome(Kind kind, ChestRewardResponse reward, String penalty, LocalDateTime lockedUntil, Integer hpCurrent,
                              boolean spared) {
        public enum Kind { OPENED, BITTEN, LOCKED }

        public long lockSeconds() {
            return ChestService.secondsLeft(lockedUntil);
        }
    }

    static long secondsLeft(LocalDateTime until) {
        if (until == null) return 0;
        return Math.max(0, java.time.Duration.between(LocalDateTime.now(), until).toSeconds());
    }

    private Character owned(Long characterId, User user) {
        Character c = characterRepository.findById(characterId)
                .orElseThrow(() -> ApiException.notFound("Личное дело не найдено."));
        if (user == null || (!AdmissionService.isGm(user) && !c.getUser().getId().equals(user.getId()))) {
            throw ApiException.forbidden("Это дело вам не выдано.");
        }
        return c;
    }

    @Transactional(readOnly = true)
    public List<ChestRewardResponse> chest(Long characterId, User user) {
        owned(characterId, user);
        return rewardRepository.findByCharacterIdOrderByCreatedAtDesc(characterId).stream()
                .map(r -> toResponse(r, false)).toList();
    }

    /** Sealed rewards per character of this player, for the badges. */
    @Transactional(readOnly = true)
    public Map<Long, Long> sealedCounts(User user) {
        Map<Long, Long> out = new LinkedHashMap<>();
        for (Character c : characterRepository.findByUserId(user.getId())) {
            out.put(c.getId(), rewardRepository.countByCharacterIdAndStatus(c.getId(), ChestReward.Status.SEALED));
        }
        return out;
    }

    @Transactional
    public OpenOutcome open(Long characterId, Long rewardId, String answer, User user) {
        Character c = owned(characterId, user);
        ChestReward r = rewardRepository.findById(rewardId)
                .filter(x -> x.getCharacter().getId().equals(characterId))
                .orElseThrow(() -> ApiException.notFound("Посылка не найдена."));
        if (r.getStatus() == ChestReward.Status.OPENED) throw ApiException.conflict("Сундучок уже открыт.");
        LocalDateTime now = LocalDateTime.now();
        if (r.getLockedUntil() != null && r.getLockedUntil().isAfter(now)) {
            return new OpenOutcome(OpenOutcome.Kind.LOCKED, null, r.getPenalty().name(), r.getLockedUntil(), c.getHpCurrent(), false);
        }
        if (r.getRiddleAnswerHash() != null && !r.getRiddleAnswerHash().equals(hashAnswer(answer))) {
            r.setWrongAttempts(r.getWrongAttempts() + 1);
            r.setWrongAnswers(write(appendWrong(readWrong(r.getWrongAnswers()), answer, now)));
            boolean spared = false;
            switch (r.getPenalty()) {
                case HP_1 -> {
                    int hp = c.getHpCurrent() == null ? 0 : c.getHpCurrent();
                    spared = hp <= 0;
                    c.setHpCurrent(Math.max(0, hp - 1));
                    characterRepository.save(c);
                }
                case LOCK_10_MIN -> r.setLockedUntil(now.plusMinutes(LOCK_MINUTES));
                case NONE -> { }
            }
            rewardRepository.save(r);
            return new OpenOutcome(OpenOutcome.Kind.BITTEN, null, r.getPenalty().name(), r.getLockedUntil(), c.getHpCurrent(), spared);
        }

        // Everything moves at once, inside this transaction.
        ChestContents contents = read(r.getContents());
        contents.getAspects().forEach((k, n) -> { if (n != null && n > 0) c.getAspects().merge(k, n, Integer::sum); });
        contents.getCoins().forEach((k, n) -> addCoins(c, k, n == null ? 0 : n));
        characterRepository.save(c);
        for (ChestContents.Item item : contents.getItems()) {
            itemRepository.save(InventoryItem.builder()
                    .character(c)
                    .name(item.getName())
                    .description(item.getDescription())
                    .rarity(rarity(item.getRarity()))
                    .origin(blank(item.getOrigin()) != null ? item.getOrigin().strip() : "Награда: " + r.getTitle())
                    .quantity(item.getQuantity() == null || item.getQuantity() < 1 ? 1 : item.getQuantity())
                    .disassembleInto(writeAspects(item.getDisassembleInto()))
                    .build());
        }
        r.setStatus(ChestReward.Status.OPENED);
        r.setOpenedAt(now);
        r.setLockedUntil(null);
        rewardRepository.save(r);
        return new OpenOutcome(OpenOutcome.Kind.OPENED, toResponse(r, false), null, null, c.getHpCurrent(), false);
    }

    private static void addCoins(Character c, String coin, int n) {
        if (n <= 0) return;
        switch (coin) {
            case "cp" -> c.setCp((c.getCp() == null ? 0 : c.getCp()) + n);
            case "sp" -> c.setSp((c.getSp() == null ? 0 : c.getSp()) + n);
            case "ep" -> c.setEp((c.getEp() == null ? 0 : c.getEp()) + n);
            case "gp" -> c.setGp((c.getGp() == null ? 0 : c.getGp()) + n);
            case "pp" -> c.setPp((c.getPp() == null ? 0 : c.getPp()) + n);
            default -> { }
        }
    }

    // ── Inventory ──

    @Transactional(readOnly = true)
    public List<InventoryItemResponse> inventory(Long characterId, User user) {
        owned(characterId, user);
        return itemRepository.findByCharacterIdOrderByCreatedAtAsc(characterId).stream().map(InventoryItemResponse::of).toList();
    }

    private InventoryItem ownedItem(Long characterId, Long itemId, User user) {
        owned(characterId, user);
        return itemRepository.findById(itemId)
                .filter(i -> i.getCharacter().getId().equals(characterId))
                .orElseThrow(() -> ApiException.notFound("Предмет не найден."));
    }

    /** Player: notes, and quantity only down (using an item up); 0 removes it. */
    @Transactional
    public InventoryItemResponse patchItem(Long characterId, Long itemId, String notes, Integer quantity, User user) {
        InventoryItem item = ownedItem(characterId, itemId, user);
        if (notes != null) item.setNotes(blank(notes));
        if (quantity != null) {
            if (quantity < 0 || quantity > item.getQuantity()) {
                throw ApiException.badRequest("Количество можно только уменьшить.");
            }
            if (quantity == 0) {
                itemRepository.delete(item);
                return null;
            }
            item.setQuantity(quantity);
        }
        return InventoryItemResponse.of(itemRepository.save(item));
    }

    public record Disassembled(Map<String, Integer> aspects, InventoryItemResponse item) {
    }

    /**
     * «Разобрать на аспекты»: one piece of the item is gone and its aspects go
     * into the bag. Only now does the player learn what it held.
     */
    @Transactional
    public Disassembled disassemble(Long characterId, Long itemId, User user) {
        InventoryItem item = ownedItem(characterId, itemId, user);
        Map<String, Integer> aspects = readAspects(item.getDisassembleInto());
        if (aspects.isEmpty()) throw ApiException.badRequest("Этот предмет не разбирается.");
        Character c = item.getCharacter();
        aspects.forEach((k, n) -> c.getAspects().merge(k, n, Integer::sum));
        characterRepository.save(c);
        if (item.getQuantity() <= 1) {
            itemRepository.delete(item);
            return new Disassembled(aspects, null);
        }
        item.setQuantity(item.getQuantity() - 1);
        return new Disassembled(aspects, InventoryItemResponse.of(itemRepository.save(item)));
    }

    @Transactional
    public void deleteItem(Long characterId, Long itemId, User user) {
        itemRepository.delete(ownedItem(characterId, itemId, user));
    }

    // ── GM ──

    @Transactional
    public List<ChestRewardResponse> send(ChestRewardRequest req, User gm) {
        String title = blank(req.getTitle());
        if (title == null) throw ApiException.badRequest("Укажите название посылки.");
        ChestContents contents = clean(req.getContents());
        if (contents.getAspects().isEmpty() && contents.getCoins().isEmpty() && contents.getItems().isEmpty()) {
            throw ApiException.badRequest("Посылка пуста: добавьте аспекты, монеты или предметы.");
        }
        String question = blank(req.getRiddleQuestion());
        String answer = blank(req.getRiddleAnswer());
        if (question != null && answer == null) throw ApiException.badRequest("У загадки нет ответа.");
        ChestReward.Penalty penalty;
        try {
            penalty = req.getPenalty() == null ? ChestReward.Penalty.NONE : ChestReward.Penalty.valueOf(req.getPenalty());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Неизвестный штраф.");
        }

        // Keyed by id: the same character picked twice gets one reward.
        Map<Long, Character> recipients = new LinkedHashMap<>();
        if (req.getCampaignId() != null) {
            characterRepository.findByCampaignId(req.getCampaignId()).stream()
                    .filter(c -> c.getApprovalStatus() == null || c.getApprovalStatus() == ApprovalStatus.APPROVED)
                    .forEach(c -> recipients.put(c.getId(), c));
        }
        for (Long id : req.getCharacterIds()) {
            recipients.put(id, characterRepository.findById(id)
                    .orElseThrow(() -> ApiException.notFound("Личное дело " + id + " не найдено.")));
        }
        if (recipients.isEmpty()) throw ApiException.badRequest("Выберите получателей.");

        String json = write(contents);
        String hash = question != null ? hashAnswer(answer) : null;
        List<ChestRewardResponse> out = new ArrayList<>();
        for (Character c : recipients.values()) {
            ChestReward r = rewardRepository.save(ChestReward.builder()
                    .character(c).title(title).gmNote(blank(req.getGmNote()))
                    .contents(json)
                    .riddleQuestion(question).riddleAnswerHash(hash)
                    .penalty(question != null ? penalty : ChestReward.Penalty.NONE)
                    .createdBy(gm != null ? gm.getUsername() : null)
                    .build());
            out.add(toResponse(r, true));
        }
        return out;
    }

    /** Keeps known aspects, coins and named items with positive amounts. */
    private ChestContents clean(ChestContents in) {
        ChestContents out = new ChestContents();
        if (in == null) return out;
        if (in.getAspects() != null) {
            in.getAspects().forEach((k, n) -> {
                if (!magic.aspectKeys().contains(k)) throw ApiException.badRequest("Неизвестный аспект: " + k + ".");
                if (n != null && n > 0) out.getAspects().put(k, n);
            });
        }
        if (in.getCoins() != null) {
            in.getCoins().forEach((k, n) -> {
                if (!COINS.contains(k)) throw ApiException.badRequest("Неизвестная монета: " + k + ".");
                if (n != null && n > 0) out.getCoins().put(k, n);
            });
        }
        if (in.getItems() != null) {
            for (ChestContents.Item item : in.getItems()) {
                if (blank(item.getName()) == null) throw ApiException.badRequest("У предмета нет названия.");
                rarity(item.getRarity());
                out.getItems().add(ChestContents.Item.builder()
                        .name(item.getName().strip()).description(blank(item.getDescription()))
                        .rarity(rarity(item.getRarity()).name()).origin(blank(item.getOrigin()))
                        .quantity(item.getQuantity() == null || item.getQuantity() < 1 ? 1 : item.getQuantity())
                        .disassembleInto(cleanAspects(item.getDisassembleInto()))
                        .build());
            }
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<ChestRewardResponse> sent(String status) {
        List<ChestReward> rows = switch (status == null ? "" : status) {
            case "SEALED" -> rewardRepository.findByStatusOrderByCreatedAtDesc(ChestReward.Status.SEALED);
            case "OPENED" -> rewardRepository.findByStatusOrderByCreatedAtDesc(ChestReward.Status.OPENED);
            default -> rewardRepository.findAllByOrderByCreatedAtDesc();
        };
        return rows.stream().map(r -> toResponse(r, true)).toList();
    }

    @Transactional
    public void deleteReward(Long id) {
        ChestReward r = rewardRepository.findById(id).orElseThrow(() -> ApiException.notFound("Посылка не найдена."));
        if (r.getStatus() != ChestReward.Status.SEALED) throw ApiException.conflict("Открытую посылку удалить нельзя.");
        rewardRepository.delete(r);
    }

    // GM inventory: add to any character, change or remove any item.
    @Transactional
    public InventoryItemResponse gmAddItem(Long characterId, ChestContents.Item body) {
        Character c = characterRepository.findById(characterId)
                .orElseThrow(() -> ApiException.notFound("Личное дело не найдено."));
        if (blank(body.getName()) == null) throw ApiException.badRequest("У предмета нет названия.");
        return gmView(itemRepository.save(InventoryItem.builder()
                .character(c).name(body.getName().strip()).description(blank(body.getDescription()))
                .rarity(rarity(body.getRarity()))
                .origin(blank(body.getOrigin()) != null ? body.getOrigin().strip() : "Выдано ГМ")
                .quantity(body.getQuantity() == null || body.getQuantity() < 1 ? 1 : body.getQuantity())
                .disassembleInto(writeAspects(cleanAspects(body.getDisassembleInto())))
                .build()));
    }

    @Transactional
    public InventoryItemResponse gmUpdateItem(Long itemId, Map<String, Object> body) {
        InventoryItem item = itemRepository.findById(itemId).orElseThrow(() -> ApiException.notFound("Предмет не найден."));
        if (body.get("name") instanceof String s && !s.isBlank()) item.setName(s.strip());
        if (body.containsKey("description")) item.setDescription(blank((String) body.get("description")));
        if (body.get("rarity") instanceof String s) item.setRarity(rarity(s));
        if (body.containsKey("origin")) item.setOrigin(blank((String) body.get("origin")));
        if (body.containsKey("notes")) item.setNotes(blank((String) body.get("notes")));
        if (body.get("quantity") instanceof Number n) {
            if (n.intValue() < 1) throw ApiException.badRequest("Количество — от 1.");
            item.setQuantity(n.intValue());
        }
        if (body.containsKey("disassembleInto")) {
            Map<String, Integer> aspects = new LinkedHashMap<>();
            if (body.get("disassembleInto") instanceof Map<?, ?> m) {
                m.forEach((k, v) -> aspects.put(String.valueOf(k), v instanceof Number n ? n.intValue() : 0));
            }
            item.setDisassembleInto(writeAspects(cleanAspects(aspects)));
        }
        return gmView(itemRepository.save(item));
    }

    private InventoryItemResponse gmView(InventoryItem item) {
        return InventoryItemResponse.ofGm(item, readAspects(item.getDisassembleInto()));
    }

    @Transactional
    public void gmDeleteItem(Long itemId) {
        itemRepository.delete(itemRepository.findById(itemId).orElseThrow(() -> ApiException.notFound("Предмет не найден.")));
    }

    // ── Item library ──

    @Transactional(readOnly = true)
    public List<ItemTemplate> templates() {
        return templateRepository.findAllByOrderByNameAsc();
    }

    @Transactional
    public ItemTemplate saveTemplate(Long id, ItemTemplate body) {
        if (blank(body.getName()) == null) throw ApiException.badRequest("У предмета нет названия.");
        ItemTemplate t = id == null ? new ItemTemplate()
                : templateRepository.findById(id).orElseThrow(() -> ApiException.notFound("Шаблон не найден."));
        t.setName(body.getName().strip());
        t.setDescription(blank(body.getDescription()));
        t.setRarity(body.getRarity() != null ? body.getRarity() : InventoryItem.Rarity.COMMON);
        t.setTags(blank(body.getTags()));
        return templateRepository.save(t);
    }

    @Transactional
    public void deleteTemplate(Long id) {
        templateRepository.delete(templateRepository.findById(id).orElseThrow(() -> ApiException.notFound("Шаблон не найден.")));
    }

    // ── Helpers ──

    /** forGm: contents and GM note always; for players only once opened. */
    private ChestRewardResponse toResponse(ChestReward r, boolean forGm) {
        boolean open = forGm || r.getStatus() == ChestReward.Status.OPENED;
        Character c = r.getCharacter();
        return ChestRewardResponse.builder()
                .id(r.getId()).characterId(c.getId()).characterName(c.getName())
                .title(r.getTitle()).status(r.getStatus().name())
                .hasRiddle(r.getRiddleAnswerHash() != null).riddleQuestion(r.getRiddleQuestion())
                .penalty(r.getPenalty().name()).lockedUntil(r.getLockedUntil()).lockSeconds(secondsLeft(r.getLockedUntil()))
                .wrongAttempts(r.getWrongAttempts())
                .wrongAnswers(forGm ? readWrong(r.getWrongAnswers()) : null)
                .gmNote(open ? r.getGmNote() : null)
                .contents(open ? (forGm ? read(r.getContents()) : withoutDisassembly(read(r.getContents()))) : null)
                .createdAt(r.getCreatedAt()).openedAt(r.getOpenedAt()).createdBy(forGm ? r.getCreatedBy() : null)
                .build();
    }

    // ── Wrong answers (GM only) ──

    static List<Map<String, String>> appendWrong(List<Map<String, String>> list, String answer, LocalDateTime at) {
        List<Map<String, String>> out = new ArrayList<>(list);
        String text = answer == null ? "" : answer.strip();
        if (text.length() > WRONG_ANSWER_LENGTH) text = text.substring(0, WRONG_ANSWER_LENGTH);
        Map<String, String> row = new LinkedHashMap<>();
        row.put("answer", text);
        row.put("at", at.withNano(0).toString());
        out.add(row);
        return out.size() > KEEP_WRONG_ANSWERS ? new ArrayList<>(out.subList(out.size() - KEEP_WRONG_ANSWERS, out.size())) : out;
    }

    private List<Map<String, String>> readWrong(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, String>>>() {
            });
        } catch (Exception e) {
            return List.of();
        }
    }

    private static ChestContents withoutDisassembly(ChestContents contents) {
        contents.getItems().forEach(i -> i.setDisassembleInto(null));
        return contents;
    }

    /** Known aspects with positive amounts; null when nothing is left. */
    private Map<String, Integer> cleanAspects(Map<String, Integer> in) {
        if (in == null) return null;
        Map<String, Integer> out = new LinkedHashMap<>();
        in.forEach((k, n) -> {
            if (!magic.aspectKeys().contains(k)) throw ApiException.badRequest("Неизвестный аспект: " + k + ".");
            if (n != null && n > 0) out.put(k, n);
        });
        return out.isEmpty() ? null : out;
    }

    private String writeAspects(Map<String, Integer> aspects) {
        return aspects == null || aspects.isEmpty() ? null : write(aspects);
    }

    private Map<String, Integer> readAspects(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<LinkedHashMap<String, Integer>>() {
            });
        } catch (Exception e) {
            return Map.of();
        }
    }

    private static InventoryItem.Rarity rarity(String raw) {
        if (raw == null || raw.isBlank()) return InventoryItem.Rarity.COMMON;
        try {
            return InventoryItem.Rarity.valueOf(raw.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Неизвестная редкость: " + raw + ".");
        }
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    private String write(Object contents) {
        try {
            return objectMapper.writeValueAsString(contents);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private ChestContents read(String json) {
        try {
            return objectMapper.readValue(json, ChestContents.class);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
