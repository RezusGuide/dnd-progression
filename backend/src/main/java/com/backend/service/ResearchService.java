package com.backend.service;

import com.backend.dto.*;
import com.backend.model.GridAnchor;

import java.util.List;

public interface ResearchService {

    List<KnownSpellResponse> getKnownSpells(Long characterId);

    List<SpellSummary> getHintedSpells(Long characterId);

    List<GridAnchor> getPattern(Long characterId, String spellId);

    void unlockCantrip(Long characterId, String spellId);

    ResearchAttemptResponse attemptResearch(Long characterId, ResearchAttemptRequest request);

    String getDraftState(Long characterId, String spellId);

    void saveDraftState(Long characterId, String spellId, String gridState);

    // DM-only, called from AdminController.
    void grantAspect(AspectGrantRequest request);

    void grantHint(HintGrantRequest request);
}
