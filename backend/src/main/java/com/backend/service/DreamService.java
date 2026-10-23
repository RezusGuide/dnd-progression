package com.backend.service;

import com.backend.dto.ChestContents;
import com.backend.dto.ChestRewardRequest;
import com.backend.dto.ChestRewardResponse;
import com.backend.dto.DreamDtos.CharacterDream;
import com.backend.dto.DreamDtos.DreamInput;
import com.backend.dto.DreamDtos.GmDream;
import com.backend.dto.DreamDtos.GmParticipant;
import com.backend.dto.DreamDtos.ParticipantInput;
import com.backend.dto.DreamDtos.PlayerDream;
import com.backend.dto.DreamDtos.PlayerParticipant;
import com.backend.entity.Campaign;
import com.backend.entity.Character;
import com.backend.entity.DreamCase;
import com.backend.entity.DreamParticipation;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.repository.CampaignRepository;
import com.backend.repository.CharacterRepository;
import com.backend.repository.DreamCaseRepository;
import com.backend.repository.DreamParticipationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * «Сны» (docs/zlatopryady/prompts/09-dreams-and-world.md): dream cases, who is
 * inside, the immersion stage and the form the dream gave, trophies into the
 * Сундучок. Players see cases of their campaigns and cases their characters
 * are in, never the GM notes, and stage, note and form only for their own
 * characters.
 */
@Service
@RequiredArgsConstructor
public class DreamService {

    private final DreamCaseRepository dreamRepository;
    private final DreamParticipationRepository participationRepository;
    private final CharacterRepository characterRepository;
    private final CampaignRepository campaignRepository;
    private final DataRegistry data;
    private final ChestService chestService;

    /** «№0012». */
    public static String caseNumber(int number) {
        return "№" + String.format("%04d", number);
    }

    // ── Players ──

    @Transactional(readOnly = true)
    public List<PlayerDream> list(User user) {
        require(user);
        List<Character> mine = characterRepository.findByUserId(user.getId());
        Set<Long> campaigns = mine.stream().map(Character::getCampaign).filter(Objects::nonNull)
                .map(Campaign::getId).collect(Collectors.toSet());
        Set<Long> joined = mine.stream()
                .flatMap(c -> participationRepository.findByCharacterId(c.getId()).stream())
                .map(p -> p.getDream().getId()).collect(Collectors.toSet());
        return dreamRepository.findAllByOrderByNumberDesc().stream()
                .filter(d -> d.getStatus() != DreamCase.Status.DRAFT)
                .filter(d -> joined.contains(d.getId()) || (d.getCampaign() != null && campaigns.contains(d.getCampaign().getId())))
                .map(d -> forPlayer(d, user)).toList();
    }

    @Transactional(readOnly = true)
    public PlayerDream get(Long id, User user) {
        require(user);
        // 404 rather than 403: a case you may not see does not exist for you.
        return list(user).stream().filter(d -> d.id().equals(id)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Дело не найдено."));
    }

    /** The open dream this character is in now, if any; owner or GM only. */
    @Transactional(readOnly = true)
    public Optional<CharacterDream> current(Long characterId, User user) {
        require(user);
        Character c = characterRepository.findById(characterId)
                .orElseThrow(() -> ApiException.notFound("Личное дело не найдено."));
        if (!AdmissionService.isGm(user) && (c.getUser() == null || !c.getUser().getId().equals(user.getId()))) {
            throw ApiException.forbidden("Это дело вам не выдано.");
        }
        return participationRepository.findByCharacterId(characterId).stream()
                .filter(p -> p.getLeftAt() == null && p.getDream().getStatus() == DreamCase.Status.OPEN)
                .max(Comparator.comparing(DreamParticipation::getJoinedAt))
                .map(p -> new CharacterDream(p.getDream().getId(), p.getDream().getNumber(), p.getDream().getTitle(),
                        p.getImmersionStage(), p.getDreamForm(), formName(p.getDreamForm())));
    }

    private PlayerDream forPlayer(DreamCase d, User user) {
        List<PlayerParticipant> people = participationRepository.findByDreamIdOrderByJoinedAtAsc(d.getId()).stream()
                .map(p -> {
                    Character c = p.getCharacter();
                    boolean mine = c.getUser() != null && c.getUser().getId().equals(user.getId());
                    return new PlayerParticipant(c.getId(), c.getName(), mine, p.getLeftAt() != null,
                            mine ? p.getImmersionStage() : null, mine ? p.getStageNote() : null,
                            mine ? p.getDreamForm() : null, mine ? formName(p.getDreamForm()) : null);
                }).toList();
        return new PlayerDream(d.getId(), d.getNumber(), d.getTitle(), d.getSummary(), d.getStatus().name(),
                d.getCampaign() != null ? d.getCampaign().getId() : null,
                d.getCampaign() != null ? d.getCampaign().getName() : null,
                d.getRewardSummary(), d.getCreatedAt(), d.getOpenedAt(), d.getClosedAt(), people);
    }

    // ── GM ──

    @Transactional(readOnly = true)
    public List<GmDream> all() {
        return dreamRepository.findAllByOrderByNumberDesc().stream().map(this::forGm).toList();
    }

    @Transactional(readOnly = true)
    public GmDream one(Long id) {
        return forGm(find(id));
    }

    /** «Следующий номер дела»: the GM may start from any number, e.g. 13. */
    @Transactional(readOnly = true)
    public int nextNumber() {
        return dreamRepository.maxNumber() + 1;
    }

    @Transactional
    public GmDream create(DreamInput in) {
        DreamCase d = new DreamCase();
        d.setNumber(number(in.number() != null ? in.number() : nextNumber(), null));
        apply(d, in, DreamCase.Status.DRAFT);
        return forGm(dreamRepository.save(d));
    }

    @Transactional
    public GmDream update(Long id, DreamInput in) {
        DreamCase d = find(id);
        if (in.number() != null && !in.number().equals(d.getNumber())) d.setNumber(number(in.number(), d.getId()));
        apply(d, in, d.getStatus());
        return forGm(dreamRepository.save(d));
    }

    private int number(int n, Long self) {
        if (n < 1 || n > 9999) throw ApiException.badRequest("Номер дела — от 1 до 9999.");
        if (dreamRepository.existsByNumber(n) && (self == null || !find(self).getNumber().equals(n))) {
            throw ApiException.conflict("Дело " + caseNumber(n) + " уже есть.");
        }
        return n;
    }

    @Transactional
    public void delete(Long id) {
        DreamCase d = find(id);
        participationRepository.deleteByDreamId(id);
        dreamRepository.delete(d);
    }

    /** Closes the case: CLEARED (зачищено) or DISTORTED (искажено). */
    @Transactional
    public GmDream close(Long id, String outcome, String rewardSummary) {
        DreamCase d = find(id);
        DreamCase.Status status = status(outcome);
        if (status != DreamCase.Status.CLEARED && status != DreamCase.Status.DISTORTED) {
            throw ApiException.badRequest("Итог — «зачищено» или «искажено».");
        }
        if (rewardSummary != null) d.setRewardSummary(blank(rewardSummary));
        changeStatus(d, status);
        return forGm(dreamRepository.save(d));
    }

    @Transactional
    public GmDream addParticipant(Long id, Long characterId) {
        DreamCase d = find(id);
        Character c = characterRepository.findById(characterId)
                .orElseThrow(() -> ApiException.notFound("Личное дело не найдено."));
        DreamParticipation p = participationRepository.findByDreamIdOrderByJoinedAtAsc(id).stream()
                .filter(x -> x.getCharacter().getId().equals(characterId)).findFirst().orElse(null);
        if (p == null) {
            participationRepository.save(DreamParticipation.builder().dream(d).character(c).build());
        } else if (p.getLeftAt() != null) {
            p.setLeftAt(null);
            participationRepository.save(p);
        } else {
            throw ApiException.conflict("Этот персонаж уже в деле.");
        }
        return forGm(d);
    }

    @Transactional
    public GmDream updateParticipant(Long id, Long participationId, ParticipantInput in) {
        DreamParticipation p = participation(id, participationId);
        if (in.immersionStage() != null) {
            if (in.immersionStage() < 0 || in.immersionStage() > DreamParticipation.MAX_STAGE) {
                throw ApiException.badRequest("Стадия погружения — от 0 до 4.");
            }
            p.setImmersionStage(in.immersionStage());
        }
        if (in.stageNote() != null) p.setStageNote(blank(in.stageNote()));
        if (in.dreamForm() != null) {
            String form = blank(in.dreamForm());
            if (form != null && data.find("races", form).isEmpty()) {
                throw ApiException.badRequest("Неизвестная раса: " + form + ".");
            }
            p.setDreamForm(form);
        }
        participationRepository.save(p);
        return forGm(p.getDream());
    }

    /** The character leaves the dream; the row stays for the record. */
    @Transactional
    public GmDream removeParticipant(Long id, Long participationId) {
        DreamParticipation p = participation(id, participationId);
        p.setLeftAt(LocalDateTime.now());
        participationRepository.save(p);
        return forGm(p.getDream());
    }

    /**
     * «Выдать трофей»: a Сундучок reward, by default to everyone still in the
     * dream, with items marked «Из сна: Дело №0012».
     */
    @Transactional
    public List<ChestRewardResponse> trophy(Long id, ChestRewardRequest req, User gm) {
        DreamCase d = find(id);
        if (req.getCharacterIds().isEmpty() && req.getCampaignId() == null) {
            req.setCharacterIds(participationRepository.findByDreamIdOrderByJoinedAtAsc(id).stream()
                    .filter(p -> p.getLeftAt() == null).map(p -> p.getCharacter().getId()).toList());
        }
        String origin = "Из сна: Дело " + caseNumber(d.getNumber());
        if (req.getContents() != null && req.getContents().getItems() != null) {
            for (ChestContents.Item item : req.getContents().getItems()) {
                if (item.getOrigin() == null || item.getOrigin().isBlank()) item.setOrigin(origin);
            }
        }
        if (req.getTitle() == null || req.getTitle().isBlank()) req.setTitle("Трофей из Дела " + caseNumber(d.getNumber()));
        return chestService.send(req, gm);
    }

    private DreamParticipation participation(Long dreamId, Long participationId) {
        return participationRepository.findById(participationId)
                .filter(p -> p.getDream().getId().equals(dreamId))
                .orElseThrow(() -> ApiException.notFound("Участник не найден."));
    }

    private DreamCase find(Long id) {
        return dreamRepository.findById(id).orElseThrow(() -> ApiException.notFound("Дело не найдено."));
    }

    private void apply(DreamCase d, DreamInput in, DreamCase.Status fallback) {
        String title = blank(in.title());
        if (title == null) throw ApiException.badRequest("Укажите название дела.");
        d.setTitle(title);
        d.setSummary(blank(in.summary()));
        d.setRewardSummary(blank(in.rewardSummary()));
        d.setGmNotes(blank(in.gmNotes()));
        d.setCampaign(in.campaignId() == null ? null : campaignRepository.findById(in.campaignId())
                .orElseThrow(() -> ApiException.notFound("Кампания не найдена.")));
        changeStatus(d, in.status() == null ? fallback : status(in.status()));
    }

    private static void changeStatus(DreamCase d, DreamCase.Status next) {
        LocalDateTime now = LocalDateTime.now();
        switch (next) {
            case OPEN -> {
                if (d.getOpenedAt() == null) d.setOpenedAt(now);
                d.setClosedAt(null);
            }
            case CLEARED, DISTORTED -> {
                if (d.getStatus() != next || d.getClosedAt() == null) d.setClosedAt(now);
                if (d.getOpenedAt() == null) d.setOpenedAt(now);
            }
            case DRAFT, ANNOUNCED -> d.setClosedAt(null);
        }
        d.setStatus(next);
    }

    private GmDream forGm(DreamCase d) {
        List<GmParticipant> people = new ArrayList<>();
        for (DreamParticipation p : participationRepository.findByDreamIdOrderByJoinedAtAsc(d.getId())) {
            Character c = p.getCharacter();
            people.add(new GmParticipant(p.getId(), c.getId(), c.getName(), c.getUser() != null ? c.getUser().getUsername() : null,
                    p.getImmersionStage(), p.getStageNote(), p.getDreamForm(), formName(p.getDreamForm()),
                    p.getJoinedAt(), p.getLeftAt()));
        }
        return new GmDream(d.getId(), d.getNumber(), d.getTitle(), d.getSummary(), d.getStatus().name(),
                d.getCampaign() != null ? d.getCampaign().getId() : null,
                d.getCampaign() != null ? d.getCampaign().getName() : null,
                d.getRewardSummary(), d.getGmNotes(), d.getCreatedAt(), d.getOpenedAt(), d.getClosedAt(), people);
    }

    private String formName(String key) {
        if (key == null) return null;
        return data.find("races", key).map(n -> n.path("nameRu").asText(key)).orElse(key);
    }

    private static DreamCase.Status status(String raw) {
        try {
            return DreamCase.Status.valueOf(raw == null ? "" : raw.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Неизвестный статус дела: " + raw + ".");
        }
    }

    private static void require(User user) {
        if (user == null) throw ApiException.forbidden("Сначала войдите.");
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
