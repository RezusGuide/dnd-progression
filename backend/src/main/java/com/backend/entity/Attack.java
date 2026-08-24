package com.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One row of a character's Attacks & Spellcasting list, e.g.
 * {name: "Longsword", attackBonus: "+5", damageType: "1d8+3 slashing"}.
 * Kept as free-text fields rather than structured dice/modifiers - see the
 * character sheet prompt's Non-goals (no dice-rolling engine here).
 */
@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Attack {

    private String name;

    @Column(name = "attack_bonus")
    private String attackBonus;

    @Column(name = "damage_type")
    private String damageType;
}
