package com.backend.service;

import com.backend.dto.AdmissionRequestResponse;
import com.backend.entity.AdmissionRequest;
import com.backend.entity.AdmissionType;
import com.backend.entity.ApprovalStatus;
import com.backend.entity.Character;
import com.backend.entity.RuneTier;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.repository.AdmissionRequestRepository;
import com.backend.repository.CharacterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Level-up requests and GM decisions. Only the GM changes a character's
 * level, rune or clearance; players ask through here.
 */
@Service
@RequiredArgsConstructor
public class AdmissionService {

    private final AdmissionRequestRepository requestRepository;
    private final CharacterRepository characterRepository;

    public static boolean isGm(User user) {
        return user != null && user.getSectionKeys().contains("*");
    }

    /** A player asks for the next level (or a given one). */
    @Transactional
    public AdmissionRequestResponse requestLevelUp(Long characterId, Integer requestedLevel, String comment, User user) {
        Character c = characterRepository.findById(characterId)
                .orElseThrow(() -> ApiException.notFound("Личное дело не найдено."));
        if (!c.getUser().getId().equals(user.getId())) {
            throw ApiException.forbidden("Это дело вам не выдано.");
        }
        if (c.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw ApiException.badRequest("Сначала дело должен одобрить ГМ.");
        }
        if (requestRepository.existsByCharacterIdAndStatus(characterId, ApprovalStatus.PENDING)) {
            throw ApiException.conflict("Заявка уже на рассмотрении.");
        }
        int target = requestedLevel == null ? c.getLevel() + 1 : requestedLevel;
        if (target <= c.getLevel() || target > 20) {
            throw ApiException.badRequest("Уровень в заявке — от " + (c.getLevel() + 1) + " до 20.");
        }
        AdmissionRequest saved = requestRepository.save(AdmissionRequest.builder()
                .character(c)
                .type(AdmissionType.LEVEL_UP)
                .requestedLevel(target)
                .aboveCap(target > c.getLevelCap())
                .playerComment(blank(comment))
                .build());
        return AdmissionRequestResponse.of(saved);
    }

    @Transactional(readOnly = true)
    public List<AdmissionRequestResponse> forCharacter(Long characterId, User user) {
        Character c = characterRepository.findById(characterId)
                .orElseThrow(() -> ApiException.notFound("Личное дело не найдено."));
        if (user == null || (!isGm(user) && !c.getUser().getId().equals(user.getId()))) {
            return List.of();
        }
        return requestRepository.findByCharacterIdOrderByCreatedAtDesc(characterId).stream()
                .map(AdmissionRequestResponse::of).toList();
    }

    @Transactional(readOnly = true)
    public List<AdmissionRequestResponse> mine(User user) {
        return requestRepository.findTop20ByCharacterUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(AdmissionRequestResponse::of).toList();
    }

    /** GM list: open requests oldest first, or recent decisions. */
    @Transactional(readOnly = true)
    public List<AdmissionRequestResponse> list(String status) {
        List<AdmissionRequest> rows = "PENDING".equals(status)
                ? requestRepository.findByStatusOrderByCreatedAtAsc(ApprovalStatus.PENDING)
                : requestRepository.findTop50ByStatusNotOrderByDecidedAtDesc(ApprovalStatus.PENDING);
        return rows.stream().map(AdmissionRequestResponse::of).toList();
    }

    /**
     * Approve. LEVEL_UP sets the level (and the clearance when above the
     * rune cap). CREATION approves the file; a rune above COMMON is applied
     * only when the GM confirms it (confirmRune), otherwise it stays COMMON.
     */
    @Transactional
    public AdmissionRequestResponse approve(Long requestId, String gmComment, boolean confirmRune, User gm) {
        AdmissionRequest r = open(requestId);
        Character c = r.getCharacter();
        if (r.getType() == AdmissionType.LEVEL_UP) {
            c.setLevel(r.getRequestedLevel());
            c.setHitDiceTotal(r.getRequestedLevel());
            c.setProficiencyBonus(CharacterRules.proficiencyBonus(r.getRequestedLevel()));
            if (r.isAboveCap()) {
                c.setClearanceLevel(r.getRequestedLevel());
            }
        } else {
            c.setApprovalStatus(ApprovalStatus.APPROVED);
            RuneTier asked = r.getRequestedRuneTier() != null ? r.getRequestedRuneTier() : RuneTier.COMMON;
            c.setRuneTier(asked == RuneTier.COMMON || confirmRune ? asked : RuneTier.COMMON);
        }
        characterRepository.save(c);
        return decide(r, ApprovalStatus.APPROVED, gmComment, gm);
    }

    @Transactional
    public AdmissionRequestResponse reject(Long requestId, String gmComment, User gm) {
        AdmissionRequest r = open(requestId);
        if (r.getType() == AdmissionType.CREATION) {
            r.getCharacter().setApprovalStatus(ApprovalStatus.REJECTED);
            characterRepository.save(r.getCharacter());
        }
        return decide(r, ApprovalStatus.REJECTED, gmComment, gm);
    }

    private AdmissionRequest open(Long requestId) {
        AdmissionRequest r = requestRepository.findById(requestId)
                .orElseThrow(() -> ApiException.notFound("Заявка не найдена."));
        if (r.getStatus() != ApprovalStatus.PENDING) {
            throw ApiException.conflict("По этой заявке уже есть решение.");
        }
        return r;
    }

    private AdmissionRequestResponse decide(AdmissionRequest r, ApprovalStatus status, String gmComment, User gm) {
        r.setStatus(status);
        r.setGmComment(blank(gmComment));
        r.setDecidedAt(LocalDateTime.now());
        r.setDecidedBy(gm != null ? gm.getUsername() : null);
        return AdmissionRequestResponse.of(requestRepository.save(r));
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
