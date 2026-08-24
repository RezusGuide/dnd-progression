package com.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// ResearchOutcomeResponse.java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ResearchOutcomeResponse {
    private boolean success;
    private int accuracyPercentage;
    private String spellName;
    private String message;
}
