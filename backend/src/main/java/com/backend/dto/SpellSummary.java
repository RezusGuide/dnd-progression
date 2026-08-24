package com.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Public catalog view - deliberately excludes Spell#pattern. Used for the
// cantrip picker and the general "browse the catalog" list; a level 1-2
// spell's pattern is only ever handed out through ResearchController's
// hint-gated endpoint.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpellSummary {
    private String id;
    private String name;
    private int level;
    private String description;
    private String castingTime;
    private String range;
    private String components;
    private String duration;
}
