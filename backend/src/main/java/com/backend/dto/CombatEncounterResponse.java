package com.backend.dto;

import com.backend.model.Combatant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CombatEncounterResponse {
    private Long id;
    private Long campaignId;
    private int round;
    private int currentTurn;
    private boolean active;
    private List<Combatant> combatants;
}
