package com.backend.dto;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

/** Пульт ГМ: the summary over the inbox, the staff table, group actions. */
public final class GmDtos {

    private GmDtos() {
    }

    public record Summary(long pendingRequests, long pendingNotes, long openDreams, long sealedParcels,
                          NextSession nextSession) {
    }

    public record NextSession(Long id, String title, Instant startUtc) {
    }

    /** One row of «Сотрудники». dream* are null when the character is in no open dream. */
    public record StaffRow(Long id, String name, Long ownerId, String player, String characterClass, String race,
                           int level, int levelCap, String approvalStatus, Long campaignId, String campaignName,
                           Integer hpCurrent, Integer hpMax, int experiencePoints, boolean inspiration,
                           Long dreamId, Integer dreamNumber, Integer dreamStage, int aspects) {
    }

    public record XpGrant(List<Long> characterIds, Integer amount, String comment) {
    }

    public record InspirationGrant(List<Long> characterIds, Boolean value) {
    }

    public record Note(String body, LocalDateTime updatedAt) {
    }
}
