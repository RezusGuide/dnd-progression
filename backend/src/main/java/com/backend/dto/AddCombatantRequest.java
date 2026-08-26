package com.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddCombatantRequest {
    private String name;
    private int initiative;
    private Integer maxHp;
    private Integer currentHp;
    private Long characterId; // optional - links back to a roster character
}
