package com.backend.service;

import com.backend.dto.KnownSpellResponse;
import com.backend.dto.ResearchNoteResponse;
import com.backend.dto.ResearchTopicSummary;
import com.backend.dto.ResearchTopicView;
import com.backend.entity.ApprovalStatus;
import com.backend.entity.Character;
import com.backend.entity.KnownSpell;
import com.backend.entity.ResearchDraftV2;
import com.backend.entity.ResearchNote;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.model.Spell;
import com.backend.repository.CharacterRepository;
import com.backend.repository.KnownSpellRepository;
import com.backend.repository.ResearchDraftV2Repository;
import com.backend.repository.ResearchNoteRepository;
import com.backend.research.Placement;
import com.backend.research.ResearchTopicGenerator;
import com.backend.research.ResearchValidator;
import com.backend.research.SpellAccess;
import com.backend.research.SpellAccess.CasterType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * "Исследования Санни" (docs/zlatopryady/magic-v2.md): the topic catalog,
 * the research table, drafts, research notes and GM decisions, combining
 * aspects, GM grants and the starter kit. The rules themselves live in
 * com.backend.research; this class adds characters, the bag and the
 * database. Errors are Russian ApiExceptions.
 */
@Service
@RequiredArgsConstructor
public class SpellResearchService {

    public static final String KNOWN = "KNOWN";
    public static final String PENDING = "PENDING";
    public static final String AVAILABLE = "AVAILABLE";
    public static final String LOCKED = "LOCKED";

    private static final TypeReference<List<Placement>> PLACEMENTS = new TypeReference<>() {
    };
    private static final TypeReference<Map<String, Integer>> COUNTS = new TypeReference<>() {
    };
    private static final TypeReference<Map<String, Object>> OBJECT = new TypeReference<>() {
    };

    private final CharacterRepository characterRepository;
    private final KnownSpellRepository knownSpellRepository;
    private final ResearchNoteRepository noteRepository;
    private final ResearchDraftV2Repository draftRepository;
    private final SpellRegistry spellRegistry;
    private final MagicData magic;
    private final GmLogService gmLog;
    // Classic Jackson 2 for the TEXT columns, as elsewhere in this codebase.
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Who may touch a character ──

    private Character owned(Long characterId, User user) {
        Character c = characterRepository.findById(characterId)
                .orElseThrow(() -> ApiException.notFound("Личное дело не найдено."));
        if (user == null || (!AdmissionService.isGm(user) && !c.getUser().getId().equals(user.getId()))) {
            throw ApiException.forbidden("Это дело вам не выдано.");
        }
        return c;
    }

    // ── Access to a topic (magic-v2.md, section 7) ──

    /** A known caster table, or FULL for a class typed in with a spell ability; null for no magic. */
    static CasterType tableOf(Character c) {
        CasterType type = SpellAccess.casterType(c.getCharacterClass());
        if (type != null) return type;
        return c.getSpellcastingAbility() != null ? CasterType.FULL : null;
    }

    public static boolean isCaster(Character c) {
        return tableOf(c) != null;
    }

    /** Why this character cannot research the spell, or null when it can. */
    String lockReason(Character c, Spell spell) {
        CasterType table = tableOf(c);
        if (table == null) return "Класс без магии";
        // Classes with a list in spells.json; Artificer and typed-in classes have none.
        CasterType listed = SpellAccess.casterType(c.getCharacterClass());
        if (listed != null && listed != CasterType.ARTIFICER) {
            String cls = c.getCharacterClass().strip().toUpperCase();
            if (spell.getClasses() == null || !spell.getClasses().contains(cls)) return "Не ваш список";
        }
        if (SpellAccess.maxSpellLevel(table, c.getLevel()) < spell.getLevel()) {
            int need = SpellAccess.levelFor(table, spell.getLevel());
            return need < 0 ? "Этому классу недоступно" : "Нужен " + need + " уровень";
        }
        if (c.getApprovalStatus() == ApprovalStatus.PENDING) return "Дело на рассмотрении";
        if (c.getApprovalStatus() == ApprovalStatus.REJECTED) return "Дело отклонено";
        return null;
    }

    private String[] statusOf(Character c, Spell spell, Set<String> known) {
        if (known.contains(spell.getId())) return new String[]{KNOWN, null};
        if (noteRepository.existsByCharacterIdAndSpellIdAndStatus(c.getId(), spell.getId(), ApprovalStatus.PENDING)) {
            return new String[]{PENDING, null};
        }
        String reason = lockReason(c, spell);
        return reason == null ? new String[]{AVAILABLE, null} : new String[]{LOCKED, reason};
    }

    private Set<String> knownIds(Long characterId) {
        return knownSpellRepository.findAllByCharacterId(characterId).stream()
                .map(KnownSpell::getSpellId).collect(Collectors.toSet());
    }

    // ── Catalog and table ──

    @Transactional(readOnly = true)
    public List<ResearchTopicSummary> topics(Long characterId, User user) {
        Character c = owned(characterId, user);
        Set<String> known = knownIds(characterId);
        Set<String> pending = noteRepository.findByCharacterIdOrderByCreatedAtDesc(characterId).stream()
                .filter(n -> n.getStatus() == ApprovalStatus.PENDING)
                .map(ResearchNote::getSpellId).collect(Collectors.toSet());
        return spellRegistry.getAllSpells().stream()
                .filter(s -> s.getLevel() >= 1)
                .sorted(Comparator.comparingInt(Spell::getLevel).thenComparing(s -> s.getNameRu() != null ? s.getNameRu() : s.getName()))
                .map(s -> {
                    String status;
                    String reason = null;
                    if (known.contains(s.getId())) status = KNOWN;
                    else if (pending.contains(s.getId())) status = PENDING;
                    else {
                        reason = lockReason(c, s);
                        status = reason == null ? AVAILABLE : LOCKED;
                    }
                    return ResearchTopicSummary.builder()
                            .spellId(s.getId()).name(s.getName()).nameRu(s.getNameRu())
                            .level(s.getLevel()).school(s.getSchool())
                            .status(status).reason(reason)
                            .build();
                })
                .toList();
    }

    private Spell topicSpell(String spellId) {
        Spell spell = spellRegistry.getSpell(spellId);
        if (spell.getLevel() < 1) throw ApiException.badRequest("Заговоры не исследуются.");
        return spell;
    }

    private ResearchTopicGenerator.Topic generate(Spell spell) {
        return ResearchTopicGenerator.generate(spell.getId(), spell.getLevel(), magic.schoolAspects(spell.getSchool()));
    }

    @Transactional(readOnly = true)
    public ResearchTopicView topic(Long characterId, String spellId, User user) {
        Character c = owned(characterId, user);
        Spell spell = topicSpell(spellId);
        ResearchTopicGenerator.Topic topic = generate(spell);
        String[] status = statusOf(c, spell, knownIds(characterId));
        List<Placement> draft = draftRepository.findByCharacterIdAndSpellId(characterId, spellId)
                .map(d -> read(d.getPlaced(), PLACEMENTS))
                .orElse(List.of());
        return ResearchTopicView.builder()
                .spellId(spell.getId()).name(spell.getName()).nameRu(spell.getNameRu())
                .level(spell.getLevel()).school(spell.getSchool())
                .status(status[0]).reason(status[1])
                .radius(topic.radius()).anchors(topic.anchors()).draft(draft)
                .build();
    }

    @Transactional
    public void saveDraft(Long characterId, String spellId, List<Placement> placed, User user) {
        Character c = owned(characterId, user);
        topicSpell(spellId);
        ResearchDraftV2 draft = draftRepository.findByCharacterIdAndSpellId(characterId, spellId)
                .orElseGet(() -> ResearchDraftV2.builder().character(c).spellId(spellId).build());
        draft.setPlaced(write(placed == null ? List.of() : placed));
        draftRepository.save(draft);
    }

    // ── Research notes ──

    @Transactional
    public ResearchNoteResponse submit(Long characterId, String spellId, List<Placement> placed, User user) {
        Character c = owned(characterId, user);
        Spell spell = topicSpell(spellId);
        String[] status = statusOf(c, spell, knownIds(characterId));
        switch (status[0]) {
            case KNOWN -> throw ApiException.conflict("Это заклинание уже изучено.");
            case PENDING -> throw ApiException.conflict("Записка по этой теме уже на рассмотрении.");
            case LOCKED -> throw ApiException.badRequest("Тема недоступна: " + status[1] + ".");
            default -> { }
        }
        List<Placement> cells = placed == null ? List.of() : placed;
        if (cells.isEmpty()) throw ApiException.badRequest("Положите на стол хотя бы один аспект.");

        ResearchTopicGenerator.Topic topic = generate(spell);
        ResearchValidator.Result result = ResearchValidator.validate(magic.graph(), topic.radius(), topic.anchors(), cells);
        if (result.problem() != null) {
            throw ApiException.badRequest(switch (result.problem()) {
                case OUTSIDE_GRID -> "Аспект лежит за краем стола.";
                case ON_ANCHOR -> "Якорь занят: на него нельзя класть аспект.";
                case TWICE_IN_A_CELL -> "В одной клетке два аспекта.";
                case UNKNOWN_ASPECT -> "Неизвестный аспект.";
            });
        }
        if (!result.valid()) {
            throw ApiException.badRequest("Записка не сходится: соедините все якоря и уберите лишние аспекты.");
        }

        Map<String, Integer> spent = new LinkedHashMap<>();
        cells.forEach(p -> spent.merge(p.aspect(), 1, Integer::sum));
        Map<String, Integer> bag = c.getAspects();
        List<String> missing = spent.entrySet().stream()
                .filter(e -> bag.getOrDefault(e.getKey(), 0) < e.getValue())
                .map(e -> magic.nameOf(e.getKey()))
                .toList();
        if (!missing.isEmpty()) {
            throw ApiException.badRequest("В сумке не хватает: " + String.join(", ", missing) + ".");
        }
        spent.forEach((k, n) -> take(bag, k, n));
        characterRepository.save(c);

        Map<String, Object> grid = new LinkedHashMap<>();
        grid.put("radius", topic.radius());
        grid.put("anchors", topic.anchors());
        grid.put("placed", cells);
        ResearchNote note = noteRepository.save(ResearchNote.builder()
                .character(c).spellId(spellId)
                .grid(write(grid)).spent(write(spent))
                .build());
        draftRepository.deleteByCharacterIdAndSpellId(characterId, spellId);
        return toResponse(note);
    }

    @Transactional(readOnly = true)
    public List<ResearchNoteResponse> notes(Long characterId, User user) {
        owned(characterId, user);
        return noteRepository.findByCharacterIdOrderByCreatedAtDesc(characterId).stream().map(this::toResponse).toList();
    }

    /** GM queue: open notes oldest first, or recent decisions. */
    @Transactional(readOnly = true)
    public List<ResearchNoteResponse> queue(String status) {
        List<ResearchNote> rows = "PENDING".equals(status)
                ? noteRepository.findByStatusOrderByCreatedAtAsc(ApprovalStatus.PENDING)
                : noteRepository.findTop50ByStatusNotOrderByDecidedAtDesc(ApprovalStatus.PENDING);
        return rows.stream().map(this::toResponse).toList();
    }

    @Transactional
    public ResearchNoteResponse approve(Long noteId, String gmComment, User gm) {
        ResearchNote note = openNote(noteId);
        if (!knownSpellRepository.existsByCharacterIdAndSpellId(note.getCharacter().getId(), note.getSpellId())) {
            knownSpellRepository.save(KnownSpell.builder().character(note.getCharacter()).spellId(note.getSpellId()).build());
        }
        return decide(note, ApprovalStatus.APPROVED, gmComment, gm);
    }

    @Transactional
    public ResearchNoteResponse reject(Long noteId, String gmComment, User gm) {
        ResearchNote note = openNote(noteId);
        Character c = note.getCharacter();
        read(note.getSpent(), COUNTS).forEach((k, n) -> c.getAspects().merge(k, n, Integer::sum));
        characterRepository.save(c);
        return decide(note, ApprovalStatus.REJECTED, gmComment, gm);
    }

    private ResearchNote openNote(Long noteId) {
        ResearchNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> ApiException.notFound("Записка не найдена."));
        if (note.getStatus() != ApprovalStatus.PENDING) throw ApiException.conflict("По этой записке уже есть решение.");
        return note;
    }

    private ResearchNoteResponse decide(ResearchNote note, ApprovalStatus status, String gmComment, User gm) {
        note.setStatus(status);
        note.setGmComment(gmComment == null || gmComment.isBlank() ? null : gmComment.strip());
        note.setDecidedAt(LocalDateTime.now());
        note.setDecidedBy(gm != null ? gm.getUsername() : null);
        ResearchNoteResponse out = toResponse(noteRepository.save(note));
        String spell = out.getSpellNameRu() != null ? out.getSpellNameRu() : note.getSpellId();
        gmLog.character(gm, status == ApprovalStatus.APPROVED ? "NOTE_APPROVED" : "NOTE_REJECTED", note.getCharacter(),
                "Записка «" + spell + "»" + (note.getGmComment() != null ? ". Комментарий: " + note.getGmComment() : ""));
        return out;
    }

    private ResearchNoteResponse toResponse(ResearchNote n) {
        Spell spell = spellRegistry.exists(n.getSpellId()) ? spellRegistry.getSpell(n.getSpellId()) : null;
        Character c = n.getCharacter();
        return ResearchNoteResponse.builder()
                .id(n.getId()).spellId(n.getSpellId())
                .spellName(spell != null ? spell.getName() : n.getSpellId())
                .spellNameRu(spell != null ? spell.getNameRu() : null)
                .spellLevel(spell != null ? spell.getLevel() : 0)
                .school(spell != null ? spell.getSchool() : null)
                .grid(read(n.getGrid(), OBJECT)).spent(read(n.getSpent(), COUNTS))
                .status(n.getStatus().name()).gmComment(n.getGmComment())
                .createdAt(n.getCreatedAt()).decidedAt(n.getDecidedAt()).decidedBy(n.getDecidedBy())
                .characterId(c.getId()).characterName(c.getName()).characterClass(c.getCharacterClass())
                .characterLevel(c.getLevel())
                .playerName(c.getUser() != null ? c.getUser().getUsername() : null)
                .build();
    }

    // ── The bag ──

    private static void take(Map<String, Integer> bag, String aspect, int n) {
        int left = bag.getOrDefault(aspect, 0) - n;
        if (left > 0) bag.put(aspect, left);
        else bag.remove(aspect);
    }

    /** "Соединить аспекты": two from the bag become their compound. */
    @Transactional
    public Map<String, Integer> combine(Long characterId, String a, String b, User user) {
        Character c = owned(characterId, user);
        String result = magic.recipe(a, b)
                .orElseThrow(() -> ApiException.badRequest("Эти аспекты не соединяются."));
        Map<String, Integer> bag = c.getAspects();
        if (bag.getOrDefault(a, 0) < 1 || bag.getOrDefault(b, 0) < 1) {
            throw ApiException.badRequest("В сумке нет нужных аспектов.");
        }
        take(bag, a, 1);
        take(bag, b, 1);
        bag.merge(result, 1, Integer::sum);
        return Map.copyOf(characterRepository.save(c).getAspects());
    }

    /** GM grant: amount of an aspect into a character's bag. */
    @Transactional
    public Map<String, Integer> grant(Long characterId, String aspect, int amount) {
        if (!magic.aspectKeys().contains(aspect)) throw ApiException.badRequest("Неизвестный аспект.");
        if (amount < 1 || amount > 99) throw ApiException.badRequest("Выдать можно от 1 до 99.");
        Character c = characterRepository.findById(characterId)
                .orElseThrow(() -> ApiException.notFound("Личное дело не найдено."));
        c.getAspects().merge(aspect, amount, Integer::sum);
        Map<String, Integer> bag = Map.copyOf(characterRepository.save(c).getAspects());
        gmLog.character("ASPECTS_GRANTED", c, magic.nameOf(aspect) + " × " + amount);
        return bag;
    }

    /** +N of each primal aspect for a caster whose file the GM just approved. */
    public void giveStarterKit(Character c) {
        if (!isCaster(c)) return;
        for (String primal : magic.primalKeys()) {
            c.getAspects().merge(primal, magic.starterKitPerPrimal(), Integer::sum);
        }
    }

    // ── Known spells (sheet) ──

    @Transactional(readOnly = true)
    public List<KnownSpellResponse> knownSpells(Long characterId) {
        return knownSpellRepository.findAllByCharacterId(characterId).stream()
                .filter(ks -> spellRegistry.exists(ks.getSpellId()))
                .map(ks -> {
                    Spell spell = spellRegistry.getSpell(ks.getSpellId());
                    return KnownSpellResponse.builder()
                            .spellId(spell.getId()).name(spell.getName()).level(spell.getLevel())
                            .school(spell.getSchool()).description(spell.getDescription())
                            .prepared(ks.isPrepared())
                            .nameRu(spell.getNameRu()).descriptionRu(spell.getDescriptionRu())
                            .build();
                })
                .toList();
    }

    /**
     * «Подготовлено» on the sheet. The prepared limit is only highlighted on
     * the frontend, never enforced here.
     */
    @Transactional
    public void setPrepared(Long characterId, String spellId, boolean prepared, User user) {
        owned(characterId, user);
        KnownSpell ks = knownSpellRepository.findByCharacterIdAndSpellId(characterId, spellId)
                .orElseThrow(() -> ApiException.notFound("Этого заклинания нет в личном деле."));
        ks.setPrepared(prepared);
        knownSpellRepository.save(ks);
    }

    /** A cantrip added from the sheet; spells of level 1+ only come through research. */
    @Transactional
    public void addCantrip(Long characterId, String spellId, User user) {
        Character c = owned(characterId, user);
        Spell spell = spellRegistry.getSpell(spellId);
        if (spell.getLevel() != 0) throw ApiException.badRequest("Без исследования открываются только заговоры.");
        if (knownSpellRepository.existsByCharacterIdAndSpellId(characterId, spellId)) {
            throw ApiException.conflict("Этот заговор уже есть в личном деле.");
        }
        if (!isCaster(c)) throw ApiException.badRequest("Этот класс не пользуется магией.");
        CasterType listed = SpellAccess.casterType(c.getCharacterClass());
        if (listed != null && listed != CasterType.ARTIFICER
                && (spell.getClasses() == null || !spell.getClasses().contains(c.getCharacterClass().strip().toUpperCase()))) {
            throw ApiException.badRequest("«" + (spell.getNameRu() != null ? spell.getNameRu() : spell.getName()) + "» не заговор этого класса.");
        }
        knownSpellRepository.save(KnownSpell.builder().character(c).spellId(spellId).build());
    }

    // ── JSON columns ──

    private String write(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private <T> T read(String json, TypeReference<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
