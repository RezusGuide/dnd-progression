package com.backend.dto;

import com.backend.entity.InventoryItem;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

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
    // Whether «Разобрать на аспекты» is offered. What it gives stays secret.
    private boolean canDisassemble;
    // GM responses only (ofGm); left out of player JSON entirely.
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Map<String, Integer> disassembleInto;

    public static InventoryItemResponse ofGm(InventoryItem i, Map<String, Integer> disassembleInto) {
        InventoryItemResponse out = of(i);
        out.setDisassembleInto(disassembleInto);
        return out;
    }

    public static InventoryItemResponse of(InventoryItem i) {
        return InventoryItemResponse.builder()
                .id(i.getId()).characterId(i.getCharacter().getId())
                .name(i.getName()).description(i.getDescription())
                .rarity(i.getRarity().name()).origin(i.getOrigin())
                .quantity(i.getQuantity()).notes(i.getNotes()).createdAt(i.getCreatedAt())
                .canDisassemble(i.getDisassembleInto() != null && !i.getDisassembleInto().isBlank())
                .build();
    }
}
