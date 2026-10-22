package com.backend.dto;

import com.backend.entity.AdmissionRequest;
import com.backend.entity.Character;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/** An admission request plus just enough about its character for lists. */
@Data
@Builder
public class AdmissionRequestResponse {
    private Long id;
    private String type;
    private String status;
    private int requestedLevel;
    private String requestedRuneTier;
    private boolean aboveCap;
    private String playerComment;
    private String gmComment;
    private LocalDateTime createdAt;
    private LocalDateTime decidedAt;
    private String decidedBy;

    private Long characterId;
    private String characterName;
    private String characterClass;
    private String characterRace;
    private int currentLevel;
    private int levelCap;
    private String runeTier;
    private String playerName;

    public static AdmissionRequestResponse of(AdmissionRequest r) {
        Character c = r.getCharacter();
        return AdmissionRequestResponse.builder()
                .id(r.getId())
                .type(r.getType().name())
                .status(r.getStatus().name())
                .requestedLevel(r.getRequestedLevel())
                .requestedRuneTier(r.getRequestedRuneTier() != null ? r.getRequestedRuneTier().name() : null)
                .aboveCap(r.isAboveCap())
                .playerComment(r.getPlayerComment())
                .gmComment(r.getGmComment())
                .createdAt(r.getCreatedAt())
                .decidedAt(r.getDecidedAt())
                .decidedBy(r.getDecidedBy())
                .characterId(c.getId())
                .characterName(c.getName())
                .characterClass(c.getCharacterClass())
                .characterRace(c.getRace())
                .currentLevel(c.getLevel())
                .levelCap(c.getLevelCap())
                .runeTier(c.getRuneTier() != null ? c.getRuneTier().name() : null)
                .playerName(c.getUser() != null ? c.getUser().getUsername() : null)
                .build();
    }
}
