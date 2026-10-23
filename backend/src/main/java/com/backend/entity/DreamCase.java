package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A dream case («Дело №0012», docs/zlatopryady/prompts/09-dreams-and-world.md).
 * The title is the in-game name only. gmNotes never reaches players -
 * always go through DreamDtos.
 */
@Entity
@Table(name = "dream_cases")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DreamCase {

    // Черновик (players never see it), Заявлено, Открыто, Зачищено, Искажено.
    public enum Status { DRAFT, ANNOUNCED, OPEN, CLEARED, DISTORTED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique. By default max + 1; the GM may pick another (to continue an
    // existing numbering, e.g. from 13).
    @Column(nullable = false, unique = true)
    private Integer number;

    @Column(nullable = false)
    private String title;

    // What the employees know.
    @Column(columnDefinition = "TEXT")
    private String summary;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private Status status = Status.DRAFT;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Campaign campaign;

    // The reward as players should read it.
    @Column(name = "reward_summary", columnDefinition = "TEXT")
    private String rewardSummary;

    @JsonIgnore
    @ToString.Exclude
    @Column(name = "gm_notes", columnDefinition = "TEXT")
    private String gmNotes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
