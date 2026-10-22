package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A reward the GM puts into a character's Сундучок (docs/zlatopryady/prompts/07-chest.md):
 * aspects, coins and items, optionally behind a riddle. Opening moves the
 * contents into the bag, the purse and the inventory once.
 *
 * The riddle answer is stored only as a hash of the normalized answer and
 * never leaves the server - always go through ChestRewardResponse.
 */
@Entity
@Table(name = "chest_rewards")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChestReward {

    public enum Status { SEALED, OPENED }

    public enum Penalty { NONE, HP_1, LOCK_10_MIN }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "character_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Character character;

    @Column(nullable = false)
    private String title;

    // Shown to the player when the reward is opened.
    @Column(name = "gm_note", columnDefinition = "TEXT")
    private String gmNote;

    // {"aspects": {"steam": 3}, "coins": {"gp": 10}, "items": [{name, description, rarity, origin}]}
    @Column(nullable = false, columnDefinition = "TEXT")
    private String contents;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private Status status = Status.SEALED;

    @Column(name = "riddle_question", columnDefinition = "TEXT")
    private String riddleQuestion;

    @JsonIgnore
    @ToString.Exclude
    @Column(name = "riddle_answer_hash", length = 64)
    private String riddleAnswerHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    @Builder.Default
    private Penalty penalty = Penalty.NONE;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "wrong_attempts", nullable = false)
    @Builder.Default
    private int wrongAttempts = 0;

    // The last 10 wrong answers, [{"answer": "...", "at": "..."}], each cut
    // to 100 characters. For the GM's eyes only (never in player responses).
    @JsonIgnore
    @ToString.Exclude
    @Column(name = "wrong_answers", columnDefinition = "TEXT")
    private String wrongAnswers;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "created_by")
    private String createdBy;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
