package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * «Журнал» of the GM console: who did what to whom and when. Written by
 * GmLogService from the services that decide, grant and change things.
 */
@Entity
@Table(name = "gm_action_log", indexes = @Index(name = "idx_gm_action_log_at", columnList = "at"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GmActionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime at;

    // Username of whoever acted; null for system work.
    private String actor;

    // A key such as XP_GRANTED; the console turns it into words.
    @Column(nullable = false, length = 40)
    private String action;

    // CHARACTER, ARTICLE, DREAM, NOTE, REQUEST...
    @Column(name = "target_type", length = 20)
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "target_name")
    private String targetName;

    @Column(length = 500)
    private String summary;

    @PrePersist
    protected void onCreate() {
        if (at == null) at = LocalDateTime.now();
    }
}
