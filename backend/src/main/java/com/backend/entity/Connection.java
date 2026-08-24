package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * An edge between two Person nodes. Plain foreign-key ids rather than JPA
 * relations, on purpose - the graph is built client-side from the already
 * fetched /api/people list, so we don't need JSON nesting or fetch joins
 * here, just two ids and a label.
 */
@Entity
@Table(name = "connections")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Connection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "person_a_id", nullable = false)
    private Long personAId;

    @Column(name = "person_b_id", nullable = false)
    private Long personBId;

    /** e.g. "friends", "siblings", "married", "coworkers". */
    @Column(nullable = false)
    private String label;

    private String notes;
}
