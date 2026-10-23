package com.backend.service;

import com.backend.dto.GmDtos.Note;
import com.backend.dto.GmDtos.NextSession;
import com.backend.dto.GmDtos.StaffRow;
import com.backend.dto.GmDtos.Summary;
import com.backend.entity.ApprovalStatus;
import com.backend.entity.Character;
import com.backend.entity.ChestReward;
import com.backend.entity.DreamCase;
import com.backend.entity.DreamParticipation;
import com.backend.entity.GameSession;
import com.backend.entity.GmNote;
import com.backend.exception.ApiException;
import com.backend.repository.AdmissionRequestRepository;
import com.backend.repository.CharacterRepository;
import com.backend.repository.ChestRewardRepository;
import com.backend.repository.DreamCaseRepository;
import com.backend.repository.DreamParticipationRepository;
import com.backend.repository.GameSessionRepository;
import com.backend.repository.GmNoteRepository;
import com.backend.repository.ResearchNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * Пульт ГМ (docs/zlatopryady/prompts/10-gm-panel-and-release.md): the summary
 * over «Входящие», the «Сотрудники» table and its group actions, and
 * «Мои правила мира». Only reachable under /api/admin (ROLE_OWNER).
 */
@Service
@RequiredArgsConstructor
public class GmConsoleService {

    public static final int MAX_XP = 100_000;

    private final AdmissionRequestRepository requestRepository;
    private final ResearchNoteRepository noteRepository;
    private final DreamCaseRepository dreamRepository;
    private final DreamParticipationRepository participationRepository;
    private final ChestRewardRepository rewardRepository;
    private final GameSessionRepository sessionRepository;
    private final CharacterRepository characterRepository;
    private final GmNoteRepository noteStore;
    private final GmLogService gmLog;

    @Transactional(readOnly = true)
    public Summary summary() {
        Instant now = Instant.now();
        GameSession next = sessionRepository.findAllByOrderByStartUtcAsc().stream()
                .filter(s -> s.getStartUtc().plus(Duration.ofMinutes(s.getDurationMinutes())).isAfter(now))
                .findFirst().orElse(null);
        return new Summary(
                requestRepository.countByStatus(ApprovalStatus.PENDING),
                noteRepository.countByStatus(ApprovalStatus.PENDING),
                dreamRepository.countByStatus(DreamCase.Status.OPEN),
                rewardRepository.countByStatus(ChestReward.Status.SEALED),
                next == null ? null : new NextSession(next.getId(), next.getTitle(), next.getStartUtc()));
    }

    // ── «Сотрудники» ──

    @Transactional(readOnly = true)
    public List<StaffRow> staff() {
        List<StaffRow> out = new ArrayList<>();
        for (Character c : characterRepository.findAll()) {
            DreamParticipation inDream = participationRepository.findByCharacterId(c.getId()).stream()
                    .filter(p -> p.getLeftAt() == null && p.getDream().getStatus() == DreamCase.Status.OPEN)
                    .max(Comparator.comparing(DreamParticipation::getJoinedAt)).orElse(null);
            int aspects = c.getAspects().values().stream().mapToInt(Integer::intValue).sum();
            out.add(new StaffRow(c.getId(), c.getName(),
                    c.getUser() != null ? c.getUser().getId() : null,
                    c.getUser() != null ? c.getUser().getUsername() : null,
                    c.getCharacterClass(), c.getRace(), c.getLevel(), c.getLevelCap(),
                    c.getApprovalStatus() != null ? c.getApprovalStatus().name() : ApprovalStatus.APPROVED.name(),
                    c.getCampaign() != null ? c.getCampaign().getId() : null,
                    c.getCampaign() != null ? c.getCampaign().getName() : null,
                    c.getHpCurrent(), c.getHpMax(),
                    c.getExperiencePoints() != null ? c.getExperiencePoints() : 0,
                    Boolean.TRUE.equals(c.getInspiration()),
                    inDream != null ? inDream.getDream().getId() : null,
                    inDream != null ? inDream.getDream().getNumber() : null,
                    inDream != null ? inDream.getImmersionStage() : null,
                    aspects));
        }
        out.sort(Comparator.comparing(StaffRow::name, String.CASE_INSENSITIVE_ORDER));
        return out;
    }

    /** «Начислить опыт»: adds to experiencePoints (a negative amount corrects, never below 0). */
    @Transactional
    public List<StaffRow> grantXp(List<Long> characterIds, Integer amount, String comment) {
        if (amount == null || amount == 0) throw ApiException.badRequest("Укажите, сколько опыта начислить.");
        if (Math.abs(amount) > MAX_XP) throw ApiException.badRequest("Не больше " + MAX_XP + " опыта за раз.");
        String note = comment == null || comment.isBlank() ? null : comment.strip();
        for (Character c : pick(characterIds)) {
            int before = c.getExperiencePoints() != null ? c.getExperiencePoints() : 0;
            int after = Math.max(0, before + amount);
            c.setExperiencePoints(after);
            characterRepository.save(c);
            gmLog.character("XP_GRANTED", c, (amount > 0 ? "+" : "") + amount + " опыта (" + before + " → " + after + ")"
                    + (note != null ? ". " + note : ""));
        }
        return staff();
    }

    @Transactional
    public List<StaffRow> setInspiration(List<Long> characterIds, Boolean value) {
        if (value == null) throw ApiException.badRequest("Вдохновение — включить или выключить.");
        for (Character c : pick(characterIds)) {
            if (Boolean.TRUE.equals(c.getInspiration()) == value) continue;
            c.setInspiration(value);
            characterRepository.save(c);
            gmLog.character("INSPIRATION", c, value ? "Вдохновение выдано" : "Вдохновение снято");
        }
        return staff();
    }

    private List<Character> pick(List<Long> ids) {
        if (ids == null || ids.isEmpty()) throw ApiException.badRequest("Выберите сотрудников.");
        List<Character> out = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(ids)) {
            out.add(characterRepository.findById(id).orElseThrow(() -> ApiException.notFound("Личное дело " + id + " не найдено.")));
        }
        return out;
    }

    // ── «Мои правила мира» ──

    @Transactional(readOnly = true)
    public Note note() {
        return noteStore.findById(GmNote.ID).map(n -> new Note(n.getBody(), n.getUpdatedAt())).orElse(new Note(null, null));
    }

    @Transactional
    public Note saveNote(String body) {
        GmNote n = noteStore.findById(GmNote.ID).orElseGet(() -> new GmNote(GmNote.ID, null, null));
        n.setBody(body == null || body.isBlank() ? null : body);
        GmNote saved = noteStore.save(n);
        return new Note(saved.getBody(), saved.getUpdatedAt());
    }
}
