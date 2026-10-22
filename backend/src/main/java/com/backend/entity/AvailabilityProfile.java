package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * A user's «График присутствия»: their IANA time zone, sleep window and a
 * weekly grid of free half-hours, all in local time
 * (docs/zlatopryady/prompts/08-calendar.md). One per user.
 */
@Entity
@Table(name = "availability_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilityProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    // IANA, e.g. "America/Toronto".
    @Column(nullable = false, length = 64)
    private String timezone;

    @Column(name = "sleep_start", nullable = false)
    @Builder.Default
    private LocalTime sleepStart = LocalTime.MIDNIGHT;

    @Column(name = "sleep_end", nullable = false)
    @Builder.Default
    private LocalTime sleepEnd = LocalTime.of(8, 0);

    // 336 chars '0'/'1': 7 days x 48 half-hours, Monday 00:00 local first.
    @Column(name = "weekly_grid", nullable = false, length = 336)
    private String weeklyGrid;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        updatedAt = LocalDateTime.now();
    }
}
