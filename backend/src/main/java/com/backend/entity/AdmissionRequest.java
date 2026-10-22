package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A request the GM approves or rejects: a new character file (CREATION) or
 * a level-up (LEVEL_UP). A level-up above the rune cap is flagged aboveCap;
 * approving it also grants the clearance (допуск).
 */
@Entity
@Table(name = "admission_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdmissionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "character_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Character character;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AdmissionType type;

    @Column(name = "requested_level", nullable = false)
    private int requestedLevel;

    // Only for CREATION: the rune the player asked for.
    @Enumerated(EnumType.STRING)
    @Column(name = "requested_rune_tier", length = 20)
    private RuneTier requestedRuneTier;

    @Column(name = "above_cap", nullable = false)
    private boolean aboveCap;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ApprovalStatus status = ApprovalStatus.PENDING;

    @Column(name = "player_comment", columnDefinition = "TEXT")
    private String playerComment;

    @Column(name = "gm_comment", columnDefinition = "TEXT")
    private String gmComment;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    // Username of the GM who decided; a plain string so deleting an
    // account never breaks the history.
    @Column(name = "decided_by")
    private String decidedBy;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
