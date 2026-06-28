package com.backend.service;


import com.backend.dto.ResearchDraftDto;
import com.backend.dto.ResearchResultDto;

public interface SpellResearchService {

    ResearchDraftDto saveDraft(Long characterId, Long spellId, String gridState);

    ResearchDraftDto getDraft(Long characterId, Long spellId);

    ResearchResultDto completeResearch(Long characterId, Long spellId, String finalGridState);
}