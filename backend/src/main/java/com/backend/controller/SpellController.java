package com.backend.controller;

import com.backend.model.Spell;
import com.backend.service.SpellRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spells")
@RequiredArgsConstructor
public class SpellController {

    private final SpellRegistry spellRegistry;

    @GetMapping("/{id}")
    public ResponseEntity<Spell> getSpell(@PathVariable String id) {
        return ResponseEntity.ok(spellRegistry.getSpell(id));
    }
}
