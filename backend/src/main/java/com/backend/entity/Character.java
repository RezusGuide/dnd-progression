package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import lombok.Builder;

@Entity
@Table(name = "characters")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Character {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "character_class")
    private String characterClass;

    private String race;

    @Column(nullable = false)
    @Builder.Default
    private int level = 1;

    @Column(columnDefinition = "TEXT")
    private String backstory;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Campaign campaign;

    @Column(columnDefinition = "TEXT")
    private String materials;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}