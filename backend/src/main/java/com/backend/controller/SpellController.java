package com.backend.controller;

import com.backend.dto.SpellSummary;
import com.backend.model.Spell;
import com.backend.service.SpellRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The public spell catalog - summaries only, never a level 1-2 spell's
 * pattern (see ResearchController#getPattern for the hint-gated version
 * of that). Used for the cantrip picker and for browsing/displaying spell
 * names, levels, and descriptions anywhere on the site.
 */
@RestController
@RequestMapping("/api/spells")
@RequiredArgsConstructor
public class SpellController {

    private final SpellRegistry spellRegistry;

    @GetMapping
    public ResponseEntity<List<SpellSummary>> listSpells() {
        return ResponseEntity.ok(spellRegistry.getAllSpells().stream().map(this::toSummary).toList());
    }

    private SpellSummary toSummary(Spell s) {
        return SpellSummary.builder()
                .id(s.getId()).name(s.getName()).level(s.getLevel()).description(s.getDescription())
                .castingTime(s.getCastingTime()).range(s.getRange()).components(s.getComponents()).duration(s.getDuration())
                .nameRu(s.getNameRu()).descriptionRu(s.getDescriptionRu())
                .build();
    }
}
