package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * «Подбор сессии»: the GM asks when the participants can play between two
 * dates (in the GM's zone); windows are computed on the fly.
 */
@Entity
@Table(name = "session_polls")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionPoll {

    public enum Status { OPEN, SCHEDULED, CANCELLED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Campaign campaign;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "session_poll_participants",
            joinColumns = @JoinColumn(name = "poll_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @Builder.Default
    private Set<User> participants = new LinkedHashSet<>();

    @Column(name = "date_from", nullable = false)
    private LocalDate dateFrom;

    @Column(name = "date_to", nullable = false)
    private LocalDate dateTo;

    @Column(name = "gm_timezone", nullable = false, length = 64)
    private String gmTimezone;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "min_participants", nullable = false)
    private int minParticipants;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private Status status = Status.OPEN;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
