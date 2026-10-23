package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * «Мои правила мира»: the GM's own Markdown note in the console. One row
 * (id 1), GM only, lives in the database and never in the repository.
 */
@Entity
@Table(name = "gm_note")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GmNote {

    public static final long ID = 1L;

    @Id
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        updatedAt = LocalDateTime.now();
    }
}
