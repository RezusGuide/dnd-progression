package com.backend.config;

import com.backend.entity.AboutProfile;
import com.backend.entity.AspectRecipe;
import com.backend.entity.MinecraftServer;
import com.backend.entity.Role;
import com.backend.repository.AboutProfileRepository;
import com.backend.repository.AspectRecipeRepository;
import com.backend.repository.MinecraftServerRepository;
import com.backend.repository.RoleRepository;
import com.backend.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Makes sure the two roles every account needs always exist:
 * - OWNER (sections=["*"]) - nobody holds it until the first person calls
 *   POST /api/admin/bootstrap-owner while logged in. That's you.
 * - MEMBER (sections=["dnd","minecraft"]) - auto-granted to every account
 *   as soon as it's created (see AuthService/RoleService), so anyone you
 *   hand a login to can immediately use the D&D and Minecraft sections.
 *   There's no per-friend role picking anymore - either someone has an
 *   account (MEMBER) or they don't.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final AboutProfileRepository aboutProfileRepository;
    private final MinecraftServerRepository minecraftServerRepository;
    private final AspectRecipeRepository aspectRecipeRepository;

    @Override
    public void run(String... args) {
        ensureRole(RoleService.OWNER_KEY, "Owner",
                "Full access to every section and the admin panel.", List.of("*"));
        ensureRole(RoleService.MEMBER_KEY, "Member",
                "Standard account access: D&D and Minecraft.", List.of("dnd", "minecraft"));
        ensureAboutProfile();
        ensureMinecraftServer();
        ensureAspectRecipes();
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

    // One-time real content for the Portfolio page, in place of the
    // "Add your bio here" placeholders - only runs if the row doesn't exist
    // yet, so it never clobbers edits made later from the site itself.
    private void ensureAboutProfile() {
        if (aboutProfileRepository.existsById("about")) {
            return;
        }
        aboutProfileRepository.save(AboutProfile.builder()
                .id("about")
                .name("Batyrali")
                .tagline("Software engineer — I build things.")
                .taglineRu("Инженер-программист — делаю разные штуки.")
                .bio("Born and raised in Almaty, Kazakhstan. I got into software engineering with a "
                        + "pretty simple goal - make money - and somewhere along the way actually started "
                        + "enjoying the craft of building things.")
                .bioRu("Родился и вырос в Алматы, Казахстан. Пошёл в разработку ПО с простой целью — "
                        + "зарабатывать деньги — и незаметно для себя всерьёз увлёкся самим процессом "
                        + "создания вещей.")
                .education("Software Engineering, IITU (International IT University), Almaty — graduated 2026.")
                .educationRu("Программная инженерия, МУИТ (Международный университет информационных "
                        + "технологий), Алматы — выпуск 2026 года.")
                // Plain List.of(...) is immutable and Hibernate needs to mutate
                // this collection in place when it manages the entity - wrap it
                // in an ArrayList or @ElementCollection saves throw
                // UnsupportedOperationException on first startup.
                .skills(new ArrayList<>(List.of("React", "Java", "Spring Boot", "PostgreSQL", "Python")))
                .location("Almaty, Kazakhstan")
                .contactEmail("give_five@mail.ru")
                .build());
    }

    // One-time real content for the Minecraft page, in place of the
    // "play.example.net" placeholder - only runs if the row doesn't exist
    // yet, so it never clobbers edits made later from the site itself.
    private void ensureMinecraftServer() {
        if (minecraftServerRepository.existsById("minecraft")) {
            return;
        }
        minecraftServerRepository.save(MinecraftServer.builder()
                .id("minecraft")
                .ip("d2pt.ru")
                .port(25565)
                .status("Alive")
                .driveUrl("https://drive.google.com/drive/folders/1EoiMlww5ziXWTTXAXXL9kMYy3RZgvXGG?hl=ru")
                .build());
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
