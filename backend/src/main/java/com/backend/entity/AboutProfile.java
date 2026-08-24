package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.domain.Persistable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Singleton row (fixed id) backing the public terminal-styled portfolio
 * page: who you are, where you studied, what you're good at. Owner-editable,
 * publicly readable - no login required to view it.
 *
 * Implements Persistable because the id is assigned ("about"), not
 * generated: without this, Spring Data sees a non-null id on a brand-new
 * instance and assumes it already exists, calling entityManager.merge()
 * instead of persist(). Merging a transient entity drags Hibernate into a
 * "copy the collections over" path that blows up on the @ElementCollection
 * below with UnsupportedOperationException the very first time this row is
 * seeded. Basing isNew() on updatedAt (only ever set by @PrePersist/
 * @PreUpdate below) makes save() persist() on first insert and merge()
 * afterwards, like normal.
 */
@Entity
@Table(name = "about_profile")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AboutProfile implements Persistable<String> {

    @Id
    @Builder.Default
    private String id = "about";

    @Builder.Default
    private String name = "Your Name";

    @Builder.Default
    private String tagline = "add a one-line tagline";

    /** Russian version of {@link #tagline}, shown when the site's lang toggle is set to RU. */
    @Column(name = "tagline_ru")
    @Builder.Default
    private String taglineRu = "";

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String bio = "Add a short bio here.";

    @Column(name = "bio_ru", columnDefinition = "TEXT")
    @Builder.Default
    private String bioRu = "";

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String education = "Add where you studied.";

    @Column(name = "education_ru", columnDefinition = "TEXT")
    @Builder.Default
    private String educationRu = "";

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "about_profile_skills", joinColumns = @JoinColumn(name = "profile_id"))
    @Column(name = "skill")
    @Builder.Default
    private List<String> skills = new ArrayList<>();

    /** Placeholder webp path for now, per the reference photos supplied. */
    @Column(name = "photo_url")
    private String photoUrl;

    private String location;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    @PrePersist
    protected void onSave() {
        updatedAt = LocalDateTime.now();
    }

    @Override
    public boolean isNew() {
        return updatedAt == null;
    }
}
