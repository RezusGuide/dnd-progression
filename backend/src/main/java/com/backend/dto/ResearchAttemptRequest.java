package com.backend.dto;

import com.backend.model.GridAnchor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

// POST body for a research attempt. spellId present = Mode 2 (hinted -
// character must already have a SpellHintGrant for it, target level comes
// from the spell's own catalog level); spellId null/blank = Mode 1 (from
// scratch - targetLevel is required instead, since the player declares
// what level they're attempting before placing anything, which is what
// determines the valid aspect-count window - see
// ResearchServiceImpl#LEVEL_ASPECT_RANGE).
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchAttemptRequest {
    private String spellId;
    private Integer targetLevel;
    private List<GridAnchor> placements;
}
