package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * A spell the character knows: a cantrip picked at creation, or a spell
 * from an approved research note. (The old percentage column of stage 4 is
 * left in the database, no longer mapped - see DataSeeder.)
 */
@Entity
@Table(name = "known_spells")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnownSpell {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    private Character character;

    @Column(name = "spell_id", nullable = false)
    private String spellId;

    // Only meaningful for preparing casters (cleric, druid, wizard, paladin,
    // artificer); for the others every known spell counts as ready. Rows
    // from before stage 7 have NULL, read as not prepared.
    private Boolean prepared;

    public boolean isPrepared() {
        return Boolean.TRUE.equals(prepared);
    }
}
