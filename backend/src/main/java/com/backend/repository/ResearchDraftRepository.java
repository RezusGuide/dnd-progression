package com.backend.repository;

import com.backend.entity.ResearchDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResearchDraftRepository extends JpaRepository<ResearchDraft, Long> {
    Optional<ResearchDraft> findByCharacterIdAndSpellId(Long characterId, String spellId);
}
