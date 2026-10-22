package com.backend.dto;

import com.backend.research.Placement;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/** The research table for one spell: grid size, anchors and the saved draft. */
@Data
@Builder
public class ResearchTopicView {
    private String spellId;
    private String name;
    private String nameRu;
    private int level;
    private String school;
    private String status;
    private String reason;
    private int radius;
    private List<Placement> anchors;
    private List<Placement> draft;
}
