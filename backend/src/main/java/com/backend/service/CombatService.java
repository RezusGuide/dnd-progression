package com.backend.service;

import com.backend.dto.AddCombatantRequest;
import com.backend.dto.CombatEncounterResponse;
import com.backend.dto.UpdateCombatantRequest;
import com.backend.entity.Campaign;
import com.backend.entity.CombatEncounter;
import com.backend.model.Combatant;
import com.backend.repository.CampaignRepository;
import com.backend.repository.CombatEncounterRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * One combat encounter per campaign - found-or-created on first access,
 * reset (not deleted) between fights so there's always exactly one row per
 * campaign. The combatant list is stored as a JSON blob (see Combatant)
 * rather than a JPA element collection.
 */
@Service
@RequiredArgsConstructor
public class CombatService {

    private final CombatEncounterRepository combatEncounterRepository;
    private final CampaignRepository campaignRepository;
    // Instantiated directly rather than @Autowired, same reasoning as
    // SpellRegistry - this project's auto-configured Jackson bean is
    // tools.jackson.databind.ObjectMapper (Jackson 3), not this classic
    // com.fasterxml.jackson.databind.ObjectMapper (Jackson 2), so
    // constructor injection of this type has no matching bean and fails
    // application startup outright.
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CombatEncounterResponse getEncounter(Long campaignId) {
        return toResponse(getOrCreate(campaignId));
    }

    @Transactional
    public CombatEncounterResponse addCombatant(Long campaignId, AddCombatantRequest request) {
        CombatEncounter encounter = getOrCreate(campaignId);
        List<Combatant> combatants = readCombatants(encounter);
        combatants.add(Combatant.builder()
                .id(UUID.randomUUID().toString())
                .name(request.getName())
                .initiative(request.getInitiative())
                .maxHp(request.getMaxHp())
                .currentHp(request.getCurrentHp() != null ? request.getCurrentHp() : request.getMaxHp())
                .characterId(request.getCharacterId())
                .conditions("")
                .build());
        return toResponse(save(encounter, combatants));
    }

    @Transactional
    public CombatEncounterResponse updateCombatant(Long campaignId, String combatantId, UpdateCombatantRequest request) {
        CombatEncounter encounter = getOrCreate(campaignId);
        List<Combatant> combatants = readCombatants(encounter);
        Combatant target = combatants.stream()
                .filter(c -> c.getId().equals(combatantId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Combatant not found"));
        target.setName(request.getName());
        target.setInitiative(request.getInitiative());
        target.setMaxHp(request.getMaxHp());
        target.setCurrentHp(request.getCurrentHp());
        target.setConditions(request.getConditions());
        return toResponse(save(encounter, combatants));
    }

    @Transactional
    public CombatEncounterResponse removeCombatant(Long campaignId, String combatantId) {
        CombatEncounter encounter = getOrCreate(campaignId);
        List<Combatant> combatants = readCombatants(encounter);
        int removedIndex = -1;
        for (int i = 0; i < combatants.size(); i++) {
            if (combatants.get(i).getId().equals(combatantId)) {
                removedIndex = i;
                break;
            }
        }
        if (removedIndex == -1) {
            throw new RuntimeException("Combatant not found");
        }
        combatants.remove(removedIndex);
        // Keep the current-turn pointer sane: if the removed combatant was
        // before the current turn, shift the pointer back with it; if the
        // list is now shorter than the pointer, clamp it.
        int currentTurn = encounter.getCurrentTurn();
        if (removedIndex < currentTurn) {
            currentTurn--;
        }
        if (combatants.isEmpty()) {
            currentTurn = 0;
        } else if (currentTurn >= combatants.size()) {
            currentTurn = combatants.size() - 1;
        }
        encounter.setCurrentTurn(Math.max(0, currentTurn));
        return toResponse(save(encounter, combatants));
    }

    // Sorts by initiative descending (ties keep their existing relative
    // order) and starts the encounter fresh at round 1, turn 0.
    @Transactional
    public CombatEncounterResponse startEncounter(Long campaignId) {
        CombatEncounter encounter = getOrCreate(campaignId);
        List<Combatant> combatants = readCombatants(encounter);
        combatants.sort(Comparator.comparingInt(Combatant::getInitiative).reversed());
        encounter.setRound(1);
        encounter.setCurrentTurn(0);
        encounter.setActive(true);
        return toResponse(save(encounter, combatants));
    }

    @Transactional
    public CombatEncounterResponse nextTurn(Long campaignId) {
        CombatEncounter encounter = getOrCreate(campaignId);
        List<Combatant> combatants = readCombatants(encounter);
        if (!combatants.isEmpty()) {
            int next = encounter.getCurrentTurn() + 1;
            if (next >= combatants.size()) {
                next = 0;
                encounter.setRound(encounter.getRound() + 1);
            }
            encounter.setCurrentTurn(next);
        }
        return toResponse(save(encounter, combatants));
    }

    @Transactional
    public CombatEncounterResponse resetEncounter(Long campaignId) {
        CombatEncounter encounter = getOrCreate(campaignId);
        encounter.setRound(1);
        encounter.setCurrentTurn(0);
        encounter.setActive(false);
        return toResponse(save(encounter, new ArrayList<>()));
    }

    private CombatEncounter getOrCreate(Long campaignId) {
        return combatEncounterRepository.findByCampaignId(campaignId)
                .orElseGet(() -> {
                    Campaign campaign = campaignRepository.findById(campaignId)
                            .orElseThrow(() -> new RuntimeException("Campaign not found"));
                    return combatEncounterRepository.save(
                            CombatEncounter.builder().campaign(campaign).build());
                });
    }

    private CombatEncounter save(CombatEncounter encounter, List<Combatant> combatants) {
        encounter.setCombatantsJson(writeCombatants(combatants));
        return combatEncounterRepository.save(encounter);
    }

    @SneakyThrows
    private List<Combatant> readCombatants(CombatEncounter encounter) {
        String json = encounter.getCombatantsJson();
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        return new ArrayList<>(objectMapper.readValue(json, new TypeReference<List<Combatant>>() {}));
    }

    @SneakyThrows
    private String writeCombatants(List<Combatant> combatants) {
        return objectMapper.writeValueAsString(combatants);
    }

    private CombatEncounterResponse toResponse(CombatEncounter encounter) {
        return CombatEncounterResponse.builder()
                .id(encounter.getId())
                .campaignId(encounter.getCampaign().getId())
                .round(encounter.getRound())
                .currentTurn(encounter.getCurrentTurn())
                .active(encounter.isActive())
                .combatants(readCombatants(encounter))
                .build();
    }
}
