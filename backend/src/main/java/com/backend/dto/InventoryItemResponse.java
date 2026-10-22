package com.backend.dto;

import com.backend.entity.InventoryItem;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class InventoryItemResponse {
    private Long id;
    private Long characterId;
    private String name;
    private String description;
    private String rarity;
    private String origin;
    private int quantity;
    private String notes;
    private LocalDateTime createdAt;

    public static InventoryItemResponse of(InventoryItem i) {
        return InventoryItemResponse.builder()
                .id(i.getId()).characterId(i.getCharacter().getId())
                .name(i.getName()).description(i.getDescription())
                .rarity(i.getRarity().name()).origin(i.getOrigin())
                .quantity(i.getQuantity()).notes(i.getNotes()).createdAt(i.getCreatedAt())
                .build();
    }
}
