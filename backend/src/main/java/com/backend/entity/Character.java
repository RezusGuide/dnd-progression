package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.Builder;

/**
 * A 5e character. This is both the "roster card" (name/class/race/level,
 * used by Characters.jsx and CampaignView.jsx) and the full character
 * sheet (CharacterSheet.jsx) - one entity, since they're 1:1.
 *
 * Only ability scores, proficiency bonus, proficiency/expertise flags, AC,
 * HP, hit dice, death saves, currency, and the free-text fields are
 * stored. Everything derivable (ability modifiers, save/skill bonuses,
 * passive perception, initiative unless overridden) is computed at render
 * time on the frontend instead, so it can't go stale.
 */
@Entity
@Table(name = "characters")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Character {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "character_class")
    private String characterClass;

    private String race;

    @Column(nullable = false)
    @Builder.Default
    private int level = 1;

    @Column(columnDefinition = "TEXT")
    private String backstory;

    // Base64 data URI (e.g. "data:image/jpeg;base64,...") - resized/
    // compressed client-side before upload (see CharacterSheet.jsx's
    // portrait handler) to keep this from bloating the row. TEXT rather
    // than a file-storage reference since this app has no file storage
    // service to point at.
    @Column(name = "portrait_data", columnDefinition = "TEXT")
    private String portraitData;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Campaign campaign;

    // Spell-research material consumption log (SpellResearchServiceImpl) -
    // unrelated to the "Equipment" field below, don't conflate the two.
    @Column(columnDefinition = "TEXT")
    private String materials;

    // ── Header ──
    private String background;

    @Column(name = "player_name")
    private String playerName;

    private String alignment;

    @Column(name = "experience_points")
    private Integer experiencePoints;

    // ── Ability scores (1-30 raw score; modifiers are derived on render) ──
    @Builder.Default
    private Integer strength = 10;
    @Builder.Default
    private Integer dexterity = 10;
    @Builder.Default
    private Integer constitution = 10;
    @Builder.Default
    private Integer intelligence = 10;
    @Builder.Default
    private Integer wisdom = 10;
    @Builder.Default
    private Integer charisma = 10;

    // Stored directly (not derived from level) so house rules can override it.
    @Column(name = "proficiency_bonus")
    @Builder.Default
    private Integer proficiencyBonus = 2;

    // Ability keys (e.g. "STR", "DEX") that are proficient saving throws.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "character_proficient_saves", joinColumns = @JoinColumn(name = "character_id"))
    @Column(name = "ability")
    @Builder.Default
    private Set<String> proficientSaves = new HashSet<>();

    // Skill keys (e.g. "ACROBATICS") the character is proficient in.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "character_proficient_skills", joinColumns = @JoinColumn(name = "character_id"))
    @Column(name = "skill")
    @Builder.Default
    private Set<String> proficientSkills = new HashSet<>();

    // Skill keys with expertise (double proficiency). A skill can appear
    // here without needing to also be checked as merely-proficient in the
    // UI - expertise implies proficiency when computing the bonus.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "character_expertise_skills", joinColumns = @JoinColumn(name = "character_id"))
    @Column(name = "skill")
    @Builder.Default
    private Set<String> expertiseSkills = new HashSet<>();

    // ── Combat ──
    @Column(name = "armor_class")
    private Integer armorClass;

    // Null = derive from Dex modifier; set = player override.
    @Column(name = "initiative_override")
    private Integer initiativeOverride;

    private Integer speed;

    @Column(name = "hp_max")
    private Integer hpMax;

    @Column(name = "hp_current")
    private Integer hpCurrent;

    @Column(name = "hp_temp")
    private Integer hpTemp;

    @Column(name = "hit_dice_total")
    private Integer hitDiceTotal;

    // e.g. "d8" - combined with hitDiceTotal for display as "5d8".
    @Column(name = "hit_dice_type")
    private String hitDiceType;

    @Column(name = "death_save_successes")
    @Builder.Default
    private Integer deathSaveSuccesses = 0;

    @Column(name = "death_save_failures")
    @Builder.Default
    private Integer deathSaveFailures = 0;

    // Boolean (not boolean) so the ALTER TABLE ADD COLUMN this generates
    // on existing rows is nullable, not NOT NULL - Postgres refuses to add
    // a NOT NULL column to a table that already has data.
    @Builder.Default
    private Boolean inspiration = false;

    // ── Attacks & spellcasting ──
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "character_attacks", joinColumns = @JoinColumn(name = "character_id"))
    @OrderColumn(name = "position")
    @Builder.Default
    private List<Attack> attacks = new ArrayList<>();

    // Spell save DC, spell attack bonus, prepared spells - one flexible
    // free-text block.
    @Column(name = "spell_notes", columnDefinition = "TEXT")
    private String spellNotes;

    // Spell slots per level (1-9), stored as JSON - {"1":{"max":4,"current":2},...}
    // - same "store as a TEXT blob, translate in the service layer" pattern
    // as ResearchDraft#currentGridState, rather than a JPA element
    // collection of a nested object (the exact kind of mapping that's
    // caused real pain elsewhere in this codebase). CharacterSheetRequest
    // carries this as a proper Map so the frontend never has to
    // stringify/parse it manually.
    @Column(name = "spell_slots_json", columnDefinition = "TEXT")
    private String spellSlotsJson;

    // Optional variant rule (DMG) some casters use instead of slots - kept
    // as plain columns since it's just two numbers, no nested structure.
    @Column(name = "spell_points_max")
    private Integer spellPointsMax;

    @Column(name = "spell_points_current")
    private Integer spellPointsCurrent;

    // ── Equipment & currency ──
    @Column(columnDefinition = "TEXT")
    private String equipment;

    @Builder.Default
    private Integer cp = 0;
    @Builder.Default
    private Integer sp = 0;
    @Builder.Default
    private Integer ep = 0;
    @Builder.Default
    private Integer gp = 0;
    @Builder.Default
    private Integer pp = 0;

    @Column(name = "other_proficiencies", columnDefinition = "TEXT")
    private String otherProficiencies;

    // ── Personality ──
    @Column(name = "personality_traits", columnDefinition = "TEXT")
    private String personalityTraits;

    @Column(columnDefinition = "TEXT")
    private String ideals;

    @Column(columnDefinition = "TEXT")
    private String bonds;

    @Column(columnDefinition = "TEXT")
    private String flaws;

    @Column(name = "features_and_traits", columnDefinition = "TEXT")
    private String featuresAndTraits;

    // ── Character details (back of sheet) ──
    private String age;
    private String height;
    private String weight;
    private String eyes;
    private String skin;
    private String hair;

    @Column(columnDefinition = "TEXT")
    private String appearance;

    @Column(name = "allies_organizations", columnDefinition = "TEXT")
    private String alliesOrganizations;

    @Column(name = "organization_name")
    private String organizationName;

    @Column(name = "additional_features", columnDefinition = "TEXT")
    private String additionalFeatures;

    @Column(columnDefinition = "TEXT")
    private String treasure;

    // ── Material pouch ──
    // Aspect key (e.g. "FIRE") -> count in stock. Only ever incremented by
    // a DM grant (AdminController) or decremented by a research attempt
    // (ResearchServiceImpl) - never directly player-editable.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "character_aspects", joinColumns = @JoinColumn(name = "character_id"))
    @MapKeyColumn(name = "aspect")
    @Column(name = "count")
    @Builder.Default
    private Map<String, Integer> aspects = new HashMap<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}