package com.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One aspect placed on the hex research grid, at axial coordinates (q, r)
 * relative to the grid's center (0, 0). Used both for a spell's required
 * pattern (SpellRegistry/spells.json) and for a player's submitted attempt
 * (ResearchAttemptRequest) - matching is a straight set comparison of
 * these triples, see ResearchServiceImpl#matchPercentage.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class GridAnchor {
    private String aspect;
    private int q;
    private int r;
}
