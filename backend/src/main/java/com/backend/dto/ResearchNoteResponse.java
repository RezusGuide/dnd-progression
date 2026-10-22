package com.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

/** A research note with its spell and character, for the sheet and the GM queue. */
@Data
@Builder
public class ResearchNoteResponse {
    private Long id;
    private String spellId;
    private String spellName;
    private String spellNameRu;
    private int spellLevel;
    private String school;
    // {"radius": 4, "anchors": [...], "placed": [...]}
    private Map<String, Object> grid;
    private Map<String, Integer> spent;
    private String status;
    private String gmComment;
    private LocalDateTime createdAt;
    private LocalDateTime decidedAt;
    private String decidedBy;

    private Long characterId;
    private String characterName;
    private String characterClass;
    private int characterLevel;
    private String playerName;
}
