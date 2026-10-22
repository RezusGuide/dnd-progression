package com.backend.config;

import com.backend.entity.Role;
import com.backend.repository.RoleRepository;
import com.backend.service.MagicData;
import com.backend.service.OptionsService;
import com.backend.service.RoleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Makes sure the two roles every account needs always exist:
 * - OWNER (sections=["*"]) - nobody holds it until the first person calls
 *   POST /api/admin/bootstrap-owner while logged in. That's you.
 * - MEMBER (sections=["dnd"]) - auto-granted to every account
 *   as soon as it's created (see AuthService/RoleService), so anyone you
 *   hand a login to can immediately use the D&D section.
 *   There's no per-friend role picking anymore - either someone has an
 *   account (MEMBER) or they don't.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final MagicData magicData;
    private final JdbcTemplate jdbcTemplate;
    private final OptionsService optionsService;

    @Override
    public void run(String... args) {
        ensureRole(RoleService.OWNER_KEY, "Owner",
                "Full access to every section and the admin panel.", List.of("*"));
        ensureRole(RoleService.MEMBER_KEY, "Member",
                "Standard account access: D&D.", List.of("dnd"));
        backfillCampaignRules();
        // One unlock_flag row per unlock key in races/classes.json.
        optionsService.ensureFlags();
        migrateAspectBags();
        relaxOldKnownSpellColumn();
    }

    // Stage 5 added rune_tier / approval_status / hit_dice_used to
    // characters. ddl-auto=update adds the columns as NULL on existing rows;
    // those characters predate the rules, so they count as approved with a
    // common rune and no spent hit dice. Only touches NULLs, so running it
    // on every start is harmless.
    private void backfillCampaignRules() {
        int rune = jdbcTemplate.update("UPDATE characters SET rune_tier = 'COMMON' WHERE rune_tier IS NULL");
        int status = jdbcTemplate.update("UPDATE characters SET approval_status = 'APPROVED' WHERE approval_status IS NULL");
        int dice = jdbcTemplate.update("UPDATE characters SET hit_dice_used = 0 WHERE hit_dice_used IS NULL");
        if (rune + status + dice > 0) {
            log.info("Backfilled campaign rules: rune_tier {}, approval_status {}, hit_dice_used {}", rune, status, dice);
        }
    }

    // Magic v2: the bag keeps only keys from data/aspects.json. The old
    // Latin aspects are dropped; running it again finds nothing to delete.
    private void migrateAspectBags() {
        List<String> keys = List.copyOf(magicData.aspectKeys());
        String marks = String.join(",", java.util.Collections.nCopies(keys.size(), "?"));
        int removed = jdbcTemplate.update(
                "DELETE FROM character_aspects WHERE aspect NOT IN (" + marks + ")", keys.toArray());
        if (removed > 0) log.info("Removed {} old aspect entries from character bags", removed);
    }

    // KnownSpell no longer maps the old "accuracy" column; existing databases
    // have it as NOT NULL, which would refuse new rows. Only relaxes the
    // constraint (the column and its data stay), and only where the column
    // exists - fresh databases never create it.
    private void relaxOldKnownSpellColumn() {
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns "
                        + "WHERE LOWER(table_name) = 'known_spells' AND LOWER(column_name) = 'accuracy_percentage'",
                Integer.class);
        if (exists != null && exists > 0) {
            jdbcTemplate.execute("ALTER TABLE known_spells ALTER COLUMN accuracy_percentage DROP NOT NULL");
        }
    }

    private void ensureRole(String key, String label, String description, List<String> sections) {
        if (roleRepository.existsByKey(key)) {
            return;
        }
        roleRepository.save(Role.builder()
                .key(key)
                .label(label)
                .description(description)
                .sections(sections)
                .build());
    }
}
