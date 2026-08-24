package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Singleton row backing the black & white Media page's intro text - what
 * content you make, in your own words. The actual links live in MediaLink.
 */
@Entity
@Table(name = "media_profile")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaProfile {

    @Id
    @Builder.Default
    private String id = "media";

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String description = "Add a description of the content you make.";

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    @PrePersist
    protected void onSave() {
        updatedAt = LocalDateTime.now();
    }
}
