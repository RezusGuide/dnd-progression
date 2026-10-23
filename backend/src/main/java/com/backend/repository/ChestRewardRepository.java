package com.backend.repository;

import com.backend.entity.ChestReward;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChestRewardRepository extends JpaRepository<ChestReward, Long> {
    List<ChestReward> findByCharacterIdOrderByCreatedAtDesc(Long characterId);
    List<ChestReward> findAllByOrderByCreatedAtDesc();
    List<ChestReward> findByStatusOrderByCreatedAtDesc(ChestReward.Status status);
    long countByStatus(ChestReward.Status status);
    long countByCharacterIdAndStatus(Long characterId, ChestReward.Status status);
    void deleteByCharacterId(Long characterId);
}
