package com.backend.repository;

import com.backend.entity.KnownSpell;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KnownSpellRepository extends JpaRepository<KnownSpell, Long> {
    List<KnownSpell> findAllByCharacterId(Long characterId);
    boolean existsByCharacterIdAndSpellId(Long characterId, String spellId);
    Optional<KnownSpell> findByCharacterIdAndSpellId(Long characterId, String spellId);
}
