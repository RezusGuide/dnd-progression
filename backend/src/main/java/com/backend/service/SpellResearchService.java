package com.backend.service;

import com.backend.dto.ResearchOutcomeResponse;

public interface SpellResearchService {

    String getDraftState(Long characterId, String spellId);

    void saveDraftState(Long characterId, String spellId, String gridState);

    ResearchOutcomeResponse evaluateAndComplete(Long characterId, String spellId, String finalGridState);
    
    void unlockCantrip(Long characterId, String spellId);
}