package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "research_drafts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchDraft {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    private Character character;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spell_id", nullable = false)
    private Spell spell;

    @Column(columnDefinition = "TEXT")
    private String currentGridState; // Serialized partial save data

    private LocalDateTime lastUpdated;
}