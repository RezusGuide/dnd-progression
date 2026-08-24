package com.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchAttemptResponse {
    private String spellId;
    private String spellName;
    private int accuracyPercentage;
    // The recorded KnownSpell accuracy after this attempt - if the
    // character already knew the spell at a higher accuracy, this attempt
    // didn't lower it (retries can only improve the locked-in %).
    private int recordedAccuracyPercentage;
    private boolean mode2Hinted;
    private Map<String, Integer> aspectsSpent;
}
