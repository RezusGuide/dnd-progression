package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * One local date that differs from the weekly grid: BUSY takes time away,
 * FREE adds it (never inside sleep). Null minutes mean the whole day.
 */
@Entity
@Table(name = "availability_exceptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilityException {

    public enum Kind { BUSY, FREE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @Column(name = "local_date", nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Kind kind;

    @Column(name = "start_minute")
    private Integer startMinute;

    @Column(name = "end_minute")
    private Integer endMinute;
}
