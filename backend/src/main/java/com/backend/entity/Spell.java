package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "spells")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Spell {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String aspectShape; // e.g., JSON or encoded string of the required node connection shape
}

