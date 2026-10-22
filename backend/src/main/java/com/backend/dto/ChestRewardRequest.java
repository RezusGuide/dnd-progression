package com.backend.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * GM: a reward for several characters, or for every approved character of a
 * campaign (campaignId). riddleAnswer is hashed on arrival and never stored
 * or returned as text.
 */
@Data
public class ChestRewardRequest {
    private List<Long> characterIds = new ArrayList<>();
    private Long campaignId;
    private String title;
    private String gmNote;
    private ChestContents contents = new ChestContents();
    private String riddleQuestion;
    private String riddleAnswer;
    private String penalty;
}
