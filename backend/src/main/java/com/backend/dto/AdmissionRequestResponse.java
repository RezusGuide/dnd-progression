package com.backend.dto;

import com.backend.entity.AdmissionRequest;
import com.backend.entity.Character;
import com.backend.service.CharacterRules;
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
    // LEVEL_UP: AVERAGE | ROLL, the die value, and the HP it adds (stored
    // once approved; until then a preview from the current CON).
    private String hpMethod;
    private Integer hpRoll;
    private Integer hpGain;
    private Integer hitDie;
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
        Integer hpGain = r.getHpGain();
        if (hpGain == null && r.getHpRoll() != null && c.getConstitution() != null) {
            int levels = Math.max(1, r.getRequestedLevel() - c.getLevel());
            hpGain = levels * CharacterRules.levelUpHp(r.getHpRoll(), CharacterRules.abilityMod(c.getConstitution()));
        }
        return AdmissionRequestResponse.builder()
                .id(r.getId())
                .type(r.getType().name())
                .status(r.getStatus().name())
                .requestedLevel(r.getRequestedLevel())
                .requestedRuneTier(r.getRequestedRuneTier() != null ? r.getRequestedRuneTier().name() : null)
                .aboveCap(r.isAboveCap())
                .hpMethod(r.getHpMethod())
                .hpRoll(r.getHpRoll())
                .hpGain(hpGain)
                .hitDie(r.getType().name().equals("LEVEL_UP") ? CharacterRules.hitDieOf(c.getHitDiceType()) : null)
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
