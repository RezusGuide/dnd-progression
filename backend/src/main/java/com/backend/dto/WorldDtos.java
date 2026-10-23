package com.backend.dto;

import java.time.LocalDateTime;

/**
 * «Мир». The player and GM views are separate records on purpose: the
 * player one has no field for the GM notes at all.
 */
public final class WorldDtos {

    private WorldDtos() {
    }

    /** What a player sees. body is null in lists and for REDACTED articles. */
    public record PlayerArticle(String slug, String category, String title, String teaser, String body,
                                String status, LocalDateTime revealedAt) {
    }

    public record GmArticle(Long id, String slug, String category, String title, String teaser, String body,
                            String status, String gmNotes, LocalDateTime revealedAt, LocalDateTime updatedAt,
                            String updatedBy) {
    }

    public record ArticleInput(String slug, String category, String title, String teaser, String body,
                               String status, String gmNotes) {
    }
}
