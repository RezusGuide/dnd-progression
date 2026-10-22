package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** A scheduled game session; the start is an instant (UTC), shown in each viewer's zone. */
@Entity
@Table(name = "game_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poll_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private SessionPoll poll;

    @Column(nullable = false)
    private String title;

    @Column(name = "start_utc", nullable = false)
    private Instant startUtc;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Campaign campaign;

    @Column(name = "created_by")
    private String createdBy;

    @Column(columnDefinition = "TEXT")
    private String note;
}
