package com.backend.repository;

import com.backend.entity.DreamParticipation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DreamParticipationRepository extends JpaRepository<DreamParticipation, Long> {
    List<DreamParticipation> findByDreamIdOrderByJoinedAtAsc(Long dreamId);
    List<DreamParticipation> findByCharacterId(Long characterId);
    void deleteByCharacterId(Long characterId);
    void deleteByDreamId(Long dreamId);
}
