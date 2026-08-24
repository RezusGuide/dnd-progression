package com.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// A character's known spell, enriched with catalog metadata for display -
// KnownSpell itself only stores spellId + accuracyPercentage.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnownSpellResponse {
    private String spellId;
    private String name;
    private int level;
    private String description;
    private int accuracyPercentage;
    private String nameRu;
    private String descriptionRu;
}
