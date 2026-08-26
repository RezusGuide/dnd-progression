package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One combat encounter per campaign, found-or-created on first access (see
 * CombatService) - there's no "list of past encounters", just the current
 * one, reset between fights. combatantsJson holds the ordered initiative
 * list as a JSON blob (see Combatant); currentTurn is an index into that
 * array.
 */
@Entity
@Table(name = "combat_encounters")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CombatEncounter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false, unique = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @JsonIgnore
    private Campaign campaign;

    @Column(name = "combatants_json", columnDefinition = "TEXT")
    @Builder.Default
    private String combatantsJson = "[]";

    @Builder.Default
    private int round = 1;

    @Column(name = "current_turn")
    @Builder.Default
    private int currentTurn = 0;

    @Builder.Default
    private boolean active = false;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        updatedAt = LocalDateTime.now();
    }
}
