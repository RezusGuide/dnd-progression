package com.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Full replace of a combatant's editable fields (name/initiative/hp/
// conditions) - the frontend always holds the full combatant object in
// state, so there's no need for partial-patch semantics here.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateCombatantRequest {
    private String name;
    private int initiative;
    private Integer maxHp;
    private Integer currentHp;
    private String conditions;
}
