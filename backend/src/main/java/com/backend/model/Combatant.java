package com.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One row in a CombatEncounter's initiative order. Stored as JSON inside
 * CombatEncounter#combatantsJson (same pattern as ResearchDraft's
 * currentGridState) rather than as its own JPA-mapped collection - a plain
 * ordered list serialized as one blob is simpler and avoids the
 * @ElementCollection headaches the rest of this codebase has already hit
 * with mutable nested state.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Combatant {
    private String id;
    private String name;
    private int initiative;
    private Integer maxHp;
    private Integer currentHp;
    // Set when this combatant was pulled from the campaign's roster, so the
    // frontend can link back to the sheet - null for an ad-hoc monster/NPC.
    private Long characterId;
    // Free text - "Poisoned, Prone", etc. No fixed condition list; the DM
    // types whatever's relevant.
    private String conditions;
}
