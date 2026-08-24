package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "poll_options")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poll_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Poll poll;

    @Column(nullable = false)
    private String label;

    @Column(name = "display_order")
    @Builder.Default
    private int displayOrder = 0;

    /** Denormalized count so the frontend doesn't need a separate tally call. */
    @Builder.Default
    private int votes = 0;
}
