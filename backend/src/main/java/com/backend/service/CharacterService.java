package com.backend.service;

import com.backend.dto.CharacterSheetRequest;
import com.backend.dto.SpellSlotLevel;
import com.backend.entity.Character;
import com.backend.entity.User;
import com.backend.entity.ApprovalStatus;
import com.backend.entity.RuneTier;
import com.backend.repository.AdmissionRequestRepository;
import com.backend.repository.ChestRewardRepository;
import com.backend.repository.InventoryItemRepository;
import com.backend.repository.KnownSpellRepository;
import com.backend.repository.ResearchDraftV2Repository;
import com.backend.repository.ResearchNoteRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import com.backend.repository.CharacterRepository;
import org.springframework.transaction.annotation.Transactional;
import com.backend.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CharacterService {

    private final CharacterRepository characterRepository;
    private final UserRepository userRepository;
    private final com.backend.repository.CampaignRepository campaignRepository;
    private final AdmissionRequestRepository admissionRequestRepository;
    private final KnownSpellRepository knownSpellRepository;
    private final ResearchNoteRepository researchNoteRepository;
    private final ResearchDraftV2Repository researchDraftRepository;
    private final ChestRewardRepository chestRewardRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final com.backend.repository.DreamParticipationRepository dreamParticipationRepository;
    private final JdbcTemplate jdbcTemplate;
    private final GmLogService gmLog;
    // Instantiated directly rather than injected - same reasoning as
    // SpellRegistry/CombatService: this project's
    // auto-configured Jackson bean is Jackson 3
    // (tools.jackson.databind.ObjectMapper), not this classic Jackson 2 one.
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Creation goes through CharacterCreationService (the wizard).

    // This is the "browse everything" listing (Characters.jsx's vault grid,
    // and Admin.jsx's character picker) - GET is still permitAll at the
    // security-filter level (SecurityConfig), but that no longer means
    // "hand out every character on the site". A specific character by id
    // (getCharacter below) is still fully public either way - that's the
    // deliberate "share this link" feature - only the browse/list surface
    // changes here: anonymous visitors get nothing, a regular account gets
    // only what it owns, and the DM (OWNER role) still sees everyone's,
    // since Admin.jsx needs the full roster to grant items/materials.
    public List<Character> getCharacters(User actingUser) {
        if (actingUser == null) {
            return List.of();
        }
        if (actingUser.isGm()) {
            return characterRepository.findAll();
        }
        return characterRepository.findByUserId(actingUser.getId());
    }

    public Character getCharacter(Long characterId) {
        return characterRepository.findById(characterId)
                .orElseThrow(() -> new RuntimeException("Личное дело не найдено."));
    }

    @Transactional
    public void deleteCharacter(Long characterId, Long userId) {
        Character character = characterRepository.findByIdAndUserId(characterId, userId)
                .orElseThrow(() -> new RuntimeException("Личное дело не найдено."));
        admissionRequestRepository.deleteByCharacterId(characterId);
        knownSpellRepository.deleteByCharacterId(characterId);
        researchNoteRepository.deleteByCharacterId(characterId);
        researchDraftRepository.deleteByCharacterId(characterId);
        chestRewardRepository.deleteByCharacterId(characterId);
        inventoryItemRepository.deleteByCharacterId(characterId);
        dreamParticipationRepository.deleteByCharacterId(characterId);
        deleteLegacyRows(characterId);
        characterRepository.delete(character);
    }

    // Tables of the old research (stage 4 and before) still hold foreign
    // keys to characters in existing databases; nothing maps them now.
    private static final String[] LEGACY_TABLES = {"research_drafts", "spell_hint_grants"};

    private void deleteLegacyRows(Long characterId) {
        for (String table : LEGACY_TABLES) {
            Integer exists = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE LOWER(table_name) = ?", Integer.class, table);
            if (exists != null && exists > 0) {
                jdbcTemplate.update("DELETE FROM " + table + " WHERE character_id = ?", characterId);
            }
        }
    }

    // Only the character's creator, or an account with the OWNER role (the
    // DM), can save sheet edits - same rule deleteCharacter above already
    // enforced. This used to be open to any signed-in account; that let one
    // player's account silently edit another player's sheet, which is the
    // opposite of what "any logged-in account can create/edit characters"
    // in the README was meant to cover (creating/editing *your own*
    // characters, not everyone else's).
    public Character updateSheet(Long characterId, CharacterSheetRequest req, Long actingUserId, boolean actingUserIsOwner) {
        Character character = characterRepository.findById(characterId)
                .orElseThrow(() -> new RuntimeException("Личное дело не найдено."));
        if (!actingUserIsOwner && !character.getUser().getId().equals(actingUserId)) {
            throw new RuntimeException("Личное дело не найдено.");
        }

        character.setName(req.getName());
        character.setCharacterClass(req.getCharacterClass());
        // Level, rune, approval and clearance belong to the GM: a player's
        // save leaves them as they are (level-ups go through AdmissionService).
        if (actingUserIsOwner) {
            character.setLevel(req.getLevel());
            if (req.getRuneTier() != null) character.setRuneTier(RuneTier.valueOf(req.getRuneTier()));
            if (req.getApprovalStatus() != null) character.setApprovalStatus(ApprovalStatus.valueOf(req.getApprovalStatus()));
            character.setClearanceLevel(req.getClearanceLevel());
        }
        character.setRace(req.getRace());
        character.setBackground(req.getBackground());
        character.setPlayerName(req.getPlayerName());
        character.setAlignment(req.getAlignment());
        character.setExperiencePoints(req.getExperiencePoints());
        character.setPortraitData(req.getPortraitData());

        character.setStrength(req.getStrength());
        character.setDexterity(req.getDexterity());
        character.setConstitution(req.getConstitution());
        character.setIntelligence(req.getIntelligence());
        character.setWisdom(req.getWisdom());
        character.setCharisma(req.getCharisma());
        character.setProficiencyBonus(CharacterRules.proficiencyBonus(character.getLevel()));

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
        int diceTotal = character.getHitDiceTotal() != null ? character.getHitDiceTotal() : 0;
        int diceUsed = req.getHitDiceUsed() != null ? req.getHitDiceUsed() : 0;
        character.setHitDiceUsed(Math.max(0, Math.min(diceTotal, diceUsed)));
        character.setDeathSaveSuccesses(req.getDeathSaveSuccesses());
        character.setDeathSaveFailures(req.getDeathSaveFailures());
        character.setInspiration(req.isInspiration());

        character.setAttacks(req.getAttacks());
        character.setSpellNotes(req.getSpellNotes());
        character.setSpellSlotsJson(writeSpellSlots(req.getSpellSlots()));
        character.setSpellPointsMax(req.getSpellPointsMax());
        character.setSpellPointsCurrent(req.getSpellPointsCurrent());

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
                .orElseThrow(() -> new RuntimeException("Личное дело не найдено."));
        character.setEquipment(appendLine(character.getEquipment(), item));
        gmLog.character("ITEM_GRANTED", character, item.strip());
        return characterRepository.save(character);
    }

    // Same approach as grantItem, targeting Materials instead of Equipment -
    // spell-research reagents/crafting supplies rather than general gear.
    // This used to be a player-editable field (CampaignView's old Materials
    // & Inventory box, PATCH /api/characters/{id}/materials) that any
    // signed-in account - not just the DM - could fully overwrite; that
    // endpoint is gone now, this DM-only append is the only way to add to
    // it going forward.
    public Character grantMaterial(Long characterId, String material) {
        Character character = characterRepository.findById(characterId)
                .orElseThrow(() -> new RuntimeException("Личное дело не найдено."));
        character.setMaterials(appendLine(character.getMaterials(), material));
        gmLog.character("MATERIAL_GRANTED", character, material.strip());
        return characterRepository.save(character);
    }

    private String appendLine(String existing, String newLine) {
        String line = "• " + newLine.strip();
        return existing == null || existing.isBlank() ? line : existing + "\n" + line;
    }

    // Null/empty maps serialize to null rather than "{}" or "null" - keeps
    // a character with no spell slots set up from getting a junk non-empty
    // value written to its row.
    private String writeSpellSlots(Map<String, SpellSlotLevel> spellSlots) {
        if (spellSlots == null || spellSlots.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(spellSlots);
        } catch (JsonProcessingException e) {
            log.warn("Could not serialize spell slots, dropping the update", e);
            return null;
        }
    }
}