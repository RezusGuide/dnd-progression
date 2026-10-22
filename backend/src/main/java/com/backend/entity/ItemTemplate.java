package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * The GM's item library for rewards. Lives only in the database (never
 * seeded from the repository): templates may hold spoilers.
 */
@Entity
@Table(name = "item_templates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    @Builder.Default
    private InventoryItem.Rarity rarity = InventoryItem.Rarity.COMMON;

    // Comma-separated, for the GM's own filtering ("ключ, сон, латунь").
    @Column(columnDefinition = "TEXT")
    private String tags;
}
