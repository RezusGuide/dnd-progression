package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * An article of the «Мир» encyclopedia (docs/zlatopryady/prompts/09-dreams-and-world.md).
 * Lives in the database and is edited by the GM; the repository only holds
 * the starting articles (resources/seed/world-seed.json).
 *
 * HIDDEN articles never reach players, REDACTED ones reach them without the
 * body, and gmNotes never does - always go through WorldDtos.
 */
@Entity
@Table(name = "world_articles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorldArticle {

    public enum Category { ORG, PLACE, PHENOMENON, LAW, LEGEND, HISTORY, PERSON, OTHER }

    public enum Status { HIDDEN, REDACTED, OPEN }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    @Builder.Default
    private Category category = Category.OTHER;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String teaser;

    // Markdown, with [[slug|text]] links to other articles.
    @Column(columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private Status status = Status.HIDDEN;

    @JsonIgnore
    @ToString.Exclude
    @Column(name = "gm_notes", columnDefinition = "TEXT")
    private String gmNotes;

    // When it last became OPEN.
    @Column(name = "revealed_at")
    private LocalDateTime revealedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private String updatedBy;

    @PrePersist
    @PreUpdate
    protected void touch() {
        updatedAt = LocalDateTime.now();
    }
}
