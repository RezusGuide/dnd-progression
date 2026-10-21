package com.backend.service;

import com.backend.entity.Campaign;
import com.backend.entity.Character;
import com.backend.entity.User;
import com.backend.repository.CampaignRepository;
import com.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;

    public Campaign createCampaign(String name, String description, Long userId) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пропуск не найден."));

        Campaign campaign = Campaign.builder()
                .name(name)
                .description(description)
                .owner(owner)
                .build();

        return campaignRepository.save(campaign);
    }

    public List<Campaign> getAllCampaigns() {
        return campaignRepository.findAllByOrderByCreatedAtDesc();
    }

    public Campaign getCampaign(Long id) {
        return campaignRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Кампания не найдена."));
    }

    public List<Character> getCampaignCharacters(Long campaignId) {
        Campaign campaign = getCampaign(campaignId);
        return campaign.getCharacters();
    }
}