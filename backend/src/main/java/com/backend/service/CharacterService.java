package com.backend.service;

import com.backend.dto.CharacterRequest;
import com.backend.dto.CharacterSheetRequest;
import com.backend.entity.Character;
import com.backend.entity.User;
import com.backend.repository.CharacterRepository;
import com.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CharacterService {

    private final CharacterRepository characterRepository;
    private final UserRepository userRepository;
    private final com.backend.repository.CampaignRepository campaignRepository;

    public Character createCharacter(CharacterRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Character character = Character.builder()
                .name(request.getName())
                .characterClass(request.getCharacterClass())
                .race(request.getRace())
                .backstory(request.getBackstory())
                .level(1)
                .user(user)
                .build();

        if (request.getCampaignId() != null) {
            com.backend.entity.Campaign campaign = campaignRepository.findById(request.getCampaignId())
                    .orElseThrow(() -> new RuntimeException("Campaign not found"));
            character.setCampaign(campaign);
        }

        return characterRepository.save(character);
    }

    // D&D is publicly viewable (see SecurityConfig - GET is permitAll), so
    // listing/reading characters isn't scoped to a logged-in user, same as
    // CampaignController#getAllCampaigns. Only create/delete/update below
    // still require an authenticated owner.
    public List<Character> getCharacters() {
        return characterRepository.findAll();
    }

    public Character getCharacter(Long characterId) {
        return characterRepository.findById(characterId)
                .orElseThrow(() -> new RuntimeException("Character not found"));
    }

    public void deleteCharacter(Long characterId, Long userId) {
        Character character = characterRepository.findByIdAndUserId(characterId, userId)
                .orElseThrow(() -> new RuntimeException("Character not found"));
        characterRepository.delete(character);
    }
    public Character updateMaterials(Long characterId, String materials, Long userId) {
        Character character = characterRepository.findByIdAndUserId(characterId, userId)
                .orElseThrow(() -> new RuntimeException("Character not found"));
        character.setMaterials(materials);
        return characterRepository.save(character);
    }

    // Any signed-in account can save a sheet, not just its creator - D&D is
    // shared-group access (README: "any logged-in account can create/edit
    // characters"), unlike deleteCharacter/updateMaterials above which
    // still predate that and stay owner-only.
    public Character updateSheet(Long characterId, CharacterSheetRequest req) {
        Character character = characterRepository.findById(characterId)
                .orElseThrow(() -> new RuntimeException("Character not found"));

        character.setName(req.getName());
        character.setCharacterClass(req.getCharacterClass());
        character.setLevel(req.getLevel());
        character.setRace(req.getRace());
        character.setBackground(req.getBackground());
        character.setPlayerName(req.getPlayerName());
        character.setAlignment(req.getAlignment());
        character.setExperiencePoints(req.getExperiencePoints());

        character.setStrength(req.getStrength());
        character.setDexterity(req.getDexterity());
        character.setConstitution(req.getConstitution());
        character.setIntelligence(req.getIntelligence());
        character.setWisdom(req.getWisdom());
        character.setCharisma(req.getCharisma());
        character.setProficiencyBonus(req.getProficiencyBonus());

        character.setProficientSaves(req.getProficientSaves());
        character.setProficientSkills(req.getProficientSkills());
        character.setExpertiseSkills(req.getExpertiseSkills());

        character.setArmorClass(req.getArmorClass());
        character.setInitiativeOverride(req.getInitiativeOverride());
        character.setSpeed(req.getSpeed());
        character.setHpMax(req.getHpMax());
        character.setHpCurrent(req.getHpCurrent());
        character.setHpTemp(req.getHpTemp());
        character.setHitDiceTotal(req.getHitDiceTotal());
        character.setHitDiceType(req.getHitDiceType());
        character.setDeathSaveSuccesses(req.getDeathSaveSuccesses());
        character.setDeathSaveFailures(req.getDeathSaveFailures());
        character.setInspiration(req.isInspiration());

        character.setAttacks(req.getAttacks());
        character.setSpellNotes(req.getSpellNotes());

        character.setEquipment(req.getEquipment());
        character.setCp(req.getCp());
        character.setSp(req.getSp());
        character.setEp(req.getEp());
        character.setGp(req.getGp());
        character.setPp(req.getPp());
        character.setOtherProficiencies(req.getOtherProficiencies());

        character.setPersonalityTraits(req.getPersonalityTraits());
        character.setIdeals(req.getIdeals());
        character.setBonds(req.getBonds());
        character.setFlaws(req.getFlaws());
        character.setFeaturesAndTraits(req.getFeaturesAndTraits());

        character.setAge(req.getAge());
        character.setHeight(req.getHeight());
        character.setWeight(req.getWeight());
        character.setEyes(req.getEyes());
        character.setSkin(req.getSkin());
        character.setHair(req.getHair());
        character.setAppearance(req.getAppearance());
        character.setAlliesOrganizations(req.getAlliesOrganizations());
        character.setOrganizationName(req.getOrganizationName());
        character.setBackstory(req.getBackstory());
        character.setAdditionalFeatures(req.getAdditionalFeatures());
        character.setTreasure(req.getTreasure());

        return characterRepository.save(character);
    }

    // DM-only (AdminController) - appends one line to the character's
    // Equipment free text instead of requiring the DM to open the sheet
    // and retype/edit the whole box by hand, where a slip could wipe out
    // gear the player already has listed.
    public Character grantItem(Long characterId, String item) {
        Character character = characterRepository.findById(characterId)
                .orElseThrow(() -> new RuntimeException("Character not found"));
        String line = "• " + item.strip();
        String existing = character.getEquipment();
        character.setEquipment(existing == null || existing.isBlank() ? line : existing + "\n" + line);
        return characterRepository.save(character);
    }
}