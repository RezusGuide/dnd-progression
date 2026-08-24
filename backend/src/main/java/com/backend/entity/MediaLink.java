package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

/** One row of the Media page: a social link, Boosty, or a partner. */
@Entity
@Table(name = "media_links")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** SOCIAL / BOOSTY / PARTNER - decorative grouping on the frontend. */
    @Builder.Default
    private String type = "SOCIAL";

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private String url;

    private String description;

    @Column(name = "display_order")
    @Builder.Default
    private int displayOrder = 0;
}
