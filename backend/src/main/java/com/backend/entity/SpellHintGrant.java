package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/**
 * A DM-only grant unlocking hinted (Mode 2) research for one character on
 * one spell - existence of the row is the grant; there's no revoke
 * endpoint since hint access is meant to never expire (per the
 * spell-research prompt). Never created by anything but AdminController.
 */
@Entity
@Table(name = "spell_hint_grants", uniqueConstraints = @UniqueConstraint(columnNames = {"character_id", "spell_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpellHintGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    private Character character;

    @Column(name = "spell_id", nullable = false)
    private String spellId;
}
