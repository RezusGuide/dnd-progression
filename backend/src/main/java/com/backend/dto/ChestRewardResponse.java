package com.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * A reward as the client sees it. There is no field for the riddle answer
 * on purpose. For players, a sealed reward carries neither contents nor the
 * GM note - only the title, whether there is a riddle and the lock.
 */
@Data
@Builder
public class ChestRewardResponse {
    private Long id;
    private Long characterId;
    private String characterName;
    private String title;
    private String status;
    private boolean hasRiddle;
    private String riddleQuestion;
    private String penalty;
    private LocalDateTime lockedUntil;
    // Seconds of lock left when the response was made. The client counts
    // down from this, so server and browser clocks or time zones never matter.
    private long lockSeconds;
    private int wrongAttempts;
    // GM only: [{"answer": "...", "at": "..."}], newest last; null for players.
    private List<Map<String, String>> wrongAnswers;
    private String gmNote;
    private ChestContents contents;
    private LocalDateTime createdAt;
    private LocalDateTime openedAt;
    private String createdBy;
}
