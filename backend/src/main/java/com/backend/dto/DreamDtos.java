package com.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * «Сны». Player and GM views are separate records: the player ones have no
 * field for the GM notes, and show stage, note and form only for the
 * player's own characters.
 */
public final class DreamDtos {

    private DreamDtos() {
    }

    public record PlayerDream(Long id, int number, String title, String summary, String status,
                              Long campaignId, String campaignName, String rewardSummary,
                              LocalDateTime createdAt, LocalDateTime openedAt, LocalDateTime closedAt,
                              List<PlayerParticipant> participants) {
    }

    /** immersionStage, stageNote and the form are null unless mine. */
    public record PlayerParticipant(Long characterId, String characterName, boolean mine, boolean left,
                                    Integer immersionStage, String stageNote, String dreamForm, String dreamFormName) {
    }

    public record GmDream(Long id, int number, String title, String summary, String status,
                          Long campaignId, String campaignName, String rewardSummary, String gmNotes,
                          LocalDateTime createdAt, LocalDateTime openedAt, LocalDateTime closedAt,
                          List<GmParticipant> participants) {
    }

    public record GmParticipant(Long id, Long characterId, String characterName, String ownerName,
                                int immersionStage, String stageNote, String dreamForm, String dreamFormName,
                                LocalDateTime joinedAt, LocalDateTime leftAt) {
    }

    public record DreamInput(String title, String summary, String status, Long campaignId,
                             String rewardSummary, String gmNotes) {
    }

    /** Null fields stay as they are; dreamForm "" means the character's own form. */
    public record ParticipantInput(Integer immersionStage, String stageNote, String dreamForm) {
    }

    /** The open dream a character is in now, for the sheet header. */
    public record CharacterDream(Long dreamId, int number, String title, int immersionStage,
                                 String dreamForm, String dreamFormName) {
    }
}
