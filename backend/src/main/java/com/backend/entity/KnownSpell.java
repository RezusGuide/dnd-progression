package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spell_id", nullable = false)
    private Spell spell;

    @Column(nullable = false)
    private Integer accuracyPercentage; // 0-100%
}
