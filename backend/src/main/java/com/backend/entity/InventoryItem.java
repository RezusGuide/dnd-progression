package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * An item in a character's inventory (опись Сундучка): from a reward, from
 * the GM directly, later from dreams (stage 9). The player may only add
 * notes and use items up; the GM may change anything.
 */
@Entity
@Table(name = "inventory_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryItem {

    public enum Rarity { COMMON, UNCOMMON, RARE, VERY_RARE, LEGENDARY, ARTIFACT }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "character_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Character character;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    @Builder.Default
    private Rarity rarity = Rarity.COMMON;

    // Where it came from, e.g. «Награда: Латунный ключ», «Из сна».
    private String origin;

    @Column(nullable = false)
    @Builder.Default
    private int quantity = 1;

    // The player's own notes.
    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
