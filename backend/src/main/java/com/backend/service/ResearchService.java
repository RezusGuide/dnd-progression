package com.backend.service;

import com.backend.dto.*;
import com.backend.model.GridAnchor;

import java.util.List;

public interface ResearchService {

    List<KnownSpellResponse> getKnownSpells(Long characterId);

    List<SpellSummary> getHintedSpells(Long characterId);

    List<GridAnchor> getPattern(Long characterId, String spellId);

    // actingUserId/actingUserIsOwner: only the character's own creator, or
    // an account with the OWNER role (the DM), may advance its research
    // state - see ResearchServiceImpl#requireOwnedCharacter.
    void unlockCantrip(Long characterId, String spellId, Long actingUserId, boolean actingUserIsOwner);

    ResearchAttemptResponse attemptResearch(Long characterId, ResearchAttemptRequest request, Long actingUserId, boolean actingUserIsOwner);

    // Aspect crafting: separate minigame from research, combining two held
    // aspects into a new one per AspectRecipe.
    AspectCraftResponse craftAspect(Long characterId, AspectCraftRequest request, Long actingUserId, boolean actingUserIsOwner);

    String getDraftState(Long characterId, String spellId);

    void saveDraftState(Long characterId, String spellId, String gridState, Long actingUserId, boolean actingUserIsOwner);

    // DM-only, called from AdminController.
    void grantAspect(AspectGrantRequest request);

    void grantHint(HintGrantRequest request);
}
