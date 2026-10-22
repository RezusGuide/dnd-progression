package com.backend.repository;

import com.backend.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    List<InventoryItem> findByCharacterIdOrderByCreatedAtAsc(Long characterId);
    void deleteByCharacterId(Long characterId);
}
