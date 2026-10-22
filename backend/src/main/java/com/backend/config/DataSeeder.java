package com.backend.config;

import com.backend.entity.AspectRecipe;
import com.backend.entity.Role;
import com.backend.repository.AspectRecipeRepository;
import com.backend.repository.RoleRepository;
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
    private final AspectRecipeRepository aspectRecipeRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        ensureRole(RoleService.OWNER_KEY, "Owner",
                "Full access to every section and the admin panel.", List.of("*"));
        ensureRole(RoleService.MEMBER_KEY, "Member",
                "Standard account access: D&D.", List.of("dnd"));
        ensureAspectRecipes();
        backfillCampaignRules();
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

    // Transcribed from the Thaumcraft 4 aspect chart (six primal aspects -
    // Aer/Ignis/Aqua/Terra/Ordo/Perditio - are not recipes themselves, they
    // just don't appear as a resultAspect here). Only seeds once; if you
    // need to correct a mistranscribed pairing later, either edit the row
    // in the database directly or wipe the table and let this reseed it -
    // it won't overwrite existing rows on every boot.
    private void ensureAspectRecipes() {
        if (aspectRecipeRepository.count() > 0) {
            return;
        }
        String[][] recipes = {
                {"VACUOS", "AER", "PERDITIO"},
                {"LUX", "AER", "IGNIS"},
                {"TEMPESTAS", "AER", "AQUA"},
                {"MOTUS", "AER", "ORDO"},
                {"VICTUS", "AQUA", "TERRA"},
                {"POTENTIA", "ORDO", "IGNIS"},
                {"PERMUTATIO", "ORDO", "PERDITIO"},
                {"PRAECANTATIO", "VACUOS", "ORDO"},
                {"TENEBRAE", "VACUOS", "PERDITIO"},
                {"VITIUM", "TENEBRAE", "PERDITIO"},
                {"ALIENIS", "VITIUM", "PRAECANTATIO"},
                {"AURAM", "PRAECANTATIO", "POTENTIA"},
                {"FAMES", "VICTUS", "VACUOS"},
                {"VENENUM", "AQUA", "PERDITIO"},
                {"MORTUUS", "VICTUS", "PERDITIO"},
                {"SPIRITUS", "VICTUS", "MORTUUS"},
                {"SANO", "VICTUS", "ORDO"},
                {"VOLATUS", "AER", "MOTUS"},
                {"BESTIA", "MOTUS", "VICTUS"},
                {"CORPUS", "MOTUS", "BESTIA"},
                {"EXANIMIS", "VACUOS", "MORTUUS"},
                {"SENSUS", "AER", "SPIRITUS"},
                {"VINCULUM", "VACUOS", "SPIRITUS"},
                {"COGNITIO", "SPIRITUS", "ORDO"},
                {"HUMANUS", "BESTIA", "COGNITIO"},
                {"INSTRUMENTUM", "HUMANUS", "ORDO"},
                {"PANNUS", "INSTRUMENTUM", "BESTIA"},
                {"FABRICO", "HUMANUS", "INSTRUMENTUM"},
                {"LUCRUM", "HUMANUS", "FAMES"},
                {"LIMUS", "VICTUS", "AQUA"},
                {"GELUM", "IGNIS", "PERDITIO"},
                {"ITER", "MOTUS", "TERRA"},
                {"HERBA", "VICTUS", "TERRA"},
                {"GRANUM", "HERBA", "VICTUS"},
                {"ARBOR", "HERBA", "AER"},
                {"MESSIS", "HERBA", "HUMANUS"},
                {"METO", "MESSIS", "INSTRUMENTUM"},
                {"PERFODIO", "TERRA", "VACUOS"},
                {"SAXUM", "TERRA", "ORDO"},
                {"VITREUS", "TERRA", "IGNIS"},
                {"METALLUM", "TERRA", "VITREUS"},
                {"TELUM", "INSTRUMENTUM", "IGNIS"},
                {"MACHINA", "MOTUS", "INSTRUMENTUM"},
                {"TUTAMEN", "INSTRUMENTUM", "TERRA"},
        };
        for (String[] r : recipes) {
            aspectRecipeRepository.save(AspectRecipe.builder()
                    .resultAspect(r[0]).componentA(r[1]).componentB(r[2])
                    .build());
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
