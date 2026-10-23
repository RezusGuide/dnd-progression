package com.backend.repository;

import com.backend.entity.ApprovalStatus;
import com.backend.entity.ResearchNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResearchNoteRepository extends JpaRepository<ResearchNote, Long> {
    List<ResearchNote> findByCharacterIdOrderByCreatedAtDesc(Long characterId);
    boolean existsByCharacterIdAndSpellIdAndStatus(Long characterId, String spellId, ApprovalStatus status);
    List<ResearchNote> findByStatusOrderByCreatedAtAsc(ApprovalStatus status);
    long countByStatus(ApprovalStatus status);
    List<ResearchNote> findTop50ByStatusNotOrderByDecidedAtDesc(ApprovalStatus status);
    void deleteByCharacterId(Long characterId);
}
