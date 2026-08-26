package com.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// One row of CharacterSheetRequest#spellSlots - max slots at this level and
// how many are currently unspent.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpellSlotLevel {
    private Integer max;
    private Integer current;
}
