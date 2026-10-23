package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A character inside a dream case: the immersion stage (0-4), what changed
 * (seen by the player), and the form the dream gave them - a race key from
 * data/races.json, any status including closed; null is their own form.
 */
@Entity
@Table(name = "dream_participations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DreamParticipation {

    public static final int MAX_STAGE = 4;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dream_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private DreamCase dream;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "character_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Character character;

    @Column(name = "immersion_stage", nullable = false)
    @Builder.Default
    private int immersionStage = 0;

    @Column(name = "stage_note", columnDefinition = "TEXT")
    private String stageNote;

    @Column(name = "dream_form", length = 60)
    private String dreamForm;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    @PrePersist
    protected void onCreate() {
        if (joinedAt == null) joinedAt = LocalDateTime.now();
    }
}
