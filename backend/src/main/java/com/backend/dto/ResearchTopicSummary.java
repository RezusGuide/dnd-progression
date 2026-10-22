package com.backend.dto;

import lombok.Builder;
import lombok.Data;

/**
 * One line of the research catalog. status: KNOWN (Изучено), PENDING (На
 * рассмотрении), AVAILABLE (Доступно) or LOCKED with a reason.
 */
@Data
@Builder
public class ResearchTopicSummary {
    private String spellId;
    private String name;
    private String nameRu;
    private int level;
    private String school;
    private String status;
    private String reason;
}
