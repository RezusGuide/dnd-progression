package com.backend.repository;

import com.backend.entity.SpellHintGrant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpellHintGrantRepository extends JpaRepository<SpellHintGrant, Long> {
    List<SpellHintGrant> findByCharacterId(Long characterId);
    boolean existsByCharacterIdAndSpellId(Long characterId, String spellId);
}
