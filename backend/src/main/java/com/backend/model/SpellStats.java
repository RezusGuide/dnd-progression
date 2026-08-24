package com.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class SpellStats {
    private int level;
    private Dice damageDice;
    private int diceCount;
    private String castingTime;
    private String range;
    private String components;
    private String duration;
    private String description;
}
