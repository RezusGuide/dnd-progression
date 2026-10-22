package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A research note (magic-v2.md, section 6): a solved grid for one spell,
 * waiting for the GM. Submitting spends the placed aspects; approval adds
 * the spell to KnownSpell, rejection gives the aspects back.
 */
@Entity
@Table(name = "research_notes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResearchNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "character_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Character character;

    @Column(name = "spell_id", nullable = false)
    private String spellId;

    // {"radius": 4, "anchors": [{q, r, aspect}], "placed": [{q, r, aspect}]}
    @Column(name = "grid", nullable = false, columnDefinition = "TEXT")
    private String grid;

    // {"flame": 1, "steam": 1} - what submitting took from the bag.
    @Column(name = "spent", nullable = false, columnDefinition = "TEXT")
    private String spent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ApprovalStatus status = ApprovalStatus.PENDING;

    @Column(name = "gm_comment", columnDefinition = "TEXT")
    private String gmComment;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "decided_by")
    private String decidedBy;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
