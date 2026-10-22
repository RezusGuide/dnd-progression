package com.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** What a Сундучок reward holds: aspects, coins (cp/sp/ep/gp/pp) and items. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChestContents {
    @Builder.Default
    private Map<String, Integer> aspects = new LinkedHashMap<>();
    @Builder.Default
    private Map<String, Integer> coins = new LinkedHashMap<>();
    @Builder.Default
    private List<Item> items = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Item {
        private String name;
        private String description;
        private String rarity;
        private String origin;
        private Integer quantity;
    }
}
