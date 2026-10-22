package com.backend.repository;

import com.backend.entity.ResearchDraftV2;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ResearchDraftV2Repository extends JpaRepository<ResearchDraftV2, Long> {
    Optional<ResearchDraftV2> findByCharacterIdAndSpellId(Long characterId, String spellId);
    void deleteByCharacterIdAndSpellId(Long characterId, String spellId);
    void deleteByCharacterId(Long characterId);
}
