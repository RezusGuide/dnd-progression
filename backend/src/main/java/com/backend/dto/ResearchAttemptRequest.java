package com.backend.dto;

import com.backend.model.GridAnchor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

// POST body for a research attempt. spellId present = Mode 2 (hinted -
// character must already have a SpellHintGrant for it); spellId null/blank
// = Mode 1 (from scratch - scored against every researchable catalog
// spell, best match wins, capped at 80).
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchAttemptRequest {
    private String spellId;
    private List<GridAnchor> placements;
}
