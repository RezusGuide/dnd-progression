package com.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

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
    private int wrongAttempts;
    private String gmNote;
    private ChestContents contents;
    private LocalDateTime createdAt;
    private LocalDateTime openedAt;
    private String createdBy;
}
