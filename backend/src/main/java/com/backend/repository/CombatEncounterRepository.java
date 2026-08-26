package com.backend.repository;

import com.backend.entity.CombatEncounter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CombatEncounterRepository extends JpaRepository<CombatEncounter, Long> {
    Optional<CombatEncounter> findByCampaignId(Long campaignId);
}
