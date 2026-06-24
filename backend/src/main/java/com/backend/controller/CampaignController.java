package com.backend.controller;

import com.backend.entity.Campaign;
import com.backend.entity.Character;
import com.backend.entity.User;
import com.backend.service.CampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;

    @PostMapping
    public ResponseEntity<Campaign> createCampaign(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(201).body(
                campaignService.createCampaign(
                        body.get("name"),
                        body.get("description"),
                        user.getId()
                )
        );
    }

    @GetMapping
    public ResponseEntity<List<Campaign>> getAllCampaigns() {
        return ResponseEntity.ok(campaignService.getAllCampaigns());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Campaign> getCampaign(@PathVariable Long id) {
        return ResponseEntity.ok(campaignService.getCampaign(id));
    }

    @GetMapping("/{id}/characters")
    public ResponseEntity<List<Character>> getCampaignCharacters(@PathVariable Long id) {
        return ResponseEntity.ok(campaignService.getCampaignCharacters(id));
    }
}