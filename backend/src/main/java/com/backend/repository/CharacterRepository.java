package com.backend.repository;

import com.backend.entity.Character;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CharacterRepository extends JpaRepository<Character, Long> {
    List<Character> findByUserId(Long userId);
    List<Character> findByCampaignId(Long campaignId);
    Optional<Character> findByIdAndUserId(Long id, Long userId);
}