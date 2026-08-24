package com.backend.config;

import com.backend.entity.AboutProfile;
import com.backend.entity.Role;
import com.backend.repository.AboutProfileRepository;
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

    @Override
    public void run(String... args) {
        ensureRole(RoleService.OWNER_KEY, "Owner",
                "Full access to every section and the admin panel.", List.of("*"));
        ensureRole(RoleService.MEMBER_KEY, "Member",
                "Standard account access: D&D and Minecraft.", List.of("dnd", "minecraft"));
        ensureAboutProfile();
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
