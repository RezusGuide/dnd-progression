package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "download_links")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DownloadLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String label;

    private String description;

    @Column(nullable = false)
    private String url;

    /** DRIVE / FILE / LINK - decorative, drives the icon on the frontend. */
    @Builder.Default
    private String kind = "LINK";

    /**
     * Section key required to see this entry, or null for public. Checked
     * in DownloadController against the caller's sections.
     */
    private String section;
}
