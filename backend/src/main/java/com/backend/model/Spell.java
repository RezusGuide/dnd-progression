package com.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * One catalog entry, loaded from spells.json by SpellRegistry. Level 0
 * (cantrips) are picked freely and have no pattern. Levels 1-2 are the
 * only ones in scope for the research minigame this pass and always have
 * a pattern - the exact aspect placements a hinted (Mode 2) attempt is
 * scored against, and one of the candidates a from-scratch (Mode 1)
 * attempt is scored against to see what it best matches.
 *
 * The pattern is intentionally never serialized to a general-purpose
 * catalog endpoint (see SpellSummary) - only handed to a client through
 * ResearchController's hint-gated endpoint, so a player can't just read
 * it out of /api/spells and skip the minigame.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class Spell {
    private String id;
    private String name;
    private int level;
    private String description;
    private String castingTime;
    private String range;
    private String components;
    private String duration;
    private List<GridAnchor> pattern;
    // Russian translation of name/description - null until translated (see
    // spells.json's per-spell nameRu/descriptionRu). The frontend falls
    // back to the English name/description whenever these are missing, so
    // the catalog is usable mid-translation rather than needing every
    // spell done before any of it can ship.
    private String nameRu;
    private String descriptionRu;
}
