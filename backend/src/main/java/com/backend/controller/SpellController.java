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
 * The public spell catalog: names, levels, schools and descriptions for the
 * cantrip picker and for showing spells anywhere on the site. Research
 * anchors come from /api/characters/{id}/research/topics/{spellId}.
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
                .id(s.getId()).name(s.getName()).level(s.getLevel()).school(s.getSchool()).description(s.getDescription())
                .castingTime(s.getCastingTime()).range(s.getRange()).components(s.getComponents()).duration(s.getDuration())
                .nameRu(s.getNameRu()).descriptionRu(s.getDescriptionRu())
                .castingTimeRu(s.getCastingTimeRu()).rangeRu(s.getRangeRu())
                .durationRu(s.getDurationRu()).componentsRu(s.getComponentsRu())
                .classes(s.getClasses())
                .build();
    }
}
