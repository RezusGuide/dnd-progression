package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Autosaved, unsent work on one research topic: the placed aspects only
 * (anchors come from the generator). Replaces the old research_drafts
 * table, which stays in the database unused.
 */
@Entity
@Table(name = "research_drafts_v2", uniqueConstraints = @UniqueConstraint(columnNames = {"character_id", "spell_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResearchDraftV2 {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "character_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Character character;

    @Column(name = "spell_id", nullable = false)
    private String spellId;

    // [{q, r, aspect}]
    @Column(name = "placed", nullable = false, columnDefinition = "TEXT")
    private String placed;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        updatedAt = LocalDateTime.now();
    }
}
