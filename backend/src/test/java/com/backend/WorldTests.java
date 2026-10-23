package com.backend;

import com.backend.dto.WorldDtos.ArticleInput;
import com.backend.dto.WorldDtos.GmArticle;
import com.backend.dto.WorldDtos.PlayerArticle;
import com.backend.exception.ApiException;
import com.backend.service.WorldService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// «Мир»: HIDDEN never reaches players, REDACTED comes without the body,
// GM notes never come at all; the seed is loaded once.
@SpringBootTest
class WorldTests {

    @Autowired private WorldService world;
    @Autowired private ObjectMapper webMapper;

    private static String slug(String base) {
        return base + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private GmArticle article(String slug, String status) {
        return world.create(new ArticleInput(slug, "PLACE", "Заголовок " + slug, "Тизер " + slug,
                "Текст статьи " + slug, status, "Заметка ГМ " + slug), null);
    }

    @Test
    void seedIsLoadedOnceAndMatchesTheDocsCopy() throws Exception {
        List<PlayerArticle> list = world.list();
        assertTrue(list.stream().anyMatch(a -> a.slug().equals("sunny") && a.status().equals("OPEN")));
        PlayerArticle demon = world.get("demon-continent");
        assertEquals("REDACTED", demon.status());
        assertNull(demon.body());
        assertEquals(0, world.seedIfEmpty());

        // The backend ships a copy of docs/zlatopryady/world-seed.json; they must not drift apart.
        Path docs = Path.of("..", "docs", "zlatopryady", "world-seed.json");
        if (Files.exists(docs)) {
            String shipped = new String(new ClassPathResource(WorldService.SEED).getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(Files.readString(docs).replace("\r\n", "\n"), shipped.replace("\r\n", "\n"));
        }
    }

    @Test
    void threeStatuses() {
        String hidden = slug("hidden");
        String redacted = slug("redacted");
        String open = slug("open");
        article(hidden, "HIDDEN");
        GmArticle r = article(redacted, "REDACTED");
        GmArticle o = article(open, "OPEN");

        List<String> slugs = world.list().stream().map(PlayerArticle::slug).toList();
        assertFalse(slugs.contains(hidden));
        assertTrue(slugs.contains(redacted));
        assertTrue(slugs.contains(open));
        assertTrue(world.list().stream().allMatch(a -> a.body() == null), "lists never carry the body");

        ApiException e = assertThrows(ApiException.class, () -> world.get(hidden));
        assertEquals(404, e.getStatus().value());
        assertNull(world.get(redacted).body());
        assertEquals("Текст статьи " + open, world.get(open).body());
        assertNotNull(o.revealedAt());
        assertNull(r.revealedAt());

        // Opening a redacted article stamps the date and shows the text.
        GmArticle opened = world.setStatus(r.id(), "OPEN", null);
        assertNotNull(opened.revealedAt());
        assertEquals("Текст статьи " + redacted, world.get(redacted).body());
        world.setStatus(r.id(), "HIDDEN", null);
        assertThrows(ApiException.class, () -> world.get(redacted));
    }

    @Test
    void gmNotesNeverReachPlayers() throws Exception {
        String hidden = slug("secret-hidden");
        String redacted = slug("secret-redacted");
        String open = slug("secret-open");
        article(hidden, "HIDDEN");
        article(redacted, "REDACTED");
        article(open, "OPEN");
        for (String json : List.of(
                webMapper.writeValueAsString(world.list()),
                webMapper.writeValueAsString(world.get(redacted)),
                webMapper.writeValueAsString(world.get(open)))) {
            assertFalse(json.contains("gmNotes"), json);
            assertFalse(json.contains("Заметка ГМ"), json);
            assertFalse(json.contains(hidden), json);
            assertFalse(json.contains("Текст статьи " + redacted), json);
        }
        // The GM view has them.
        assertTrue(webMapper.writeValueAsString(world.all()).contains("Заметка ГМ " + open));
    }

    @Test
    void slugsAreCheckedAndUnique() {
        String s = slug("unique");
        article(s, "OPEN");
        assertThrows(ApiException.class, () -> article(s, "OPEN"));
        assertThrows(ApiException.class, () -> article("Демон континент", "OPEN"));
        assertThrows(ApiException.class, () -> world.create(new ArticleInput(slug("x"), "PLACE", " ", null, null, "OPEN", null), null));
        assertThrows(ApiException.class, () -> world.create(new ArticleInput(slug("x"), "NOPE", "T", null, null, "OPEN", null), null));
    }
}
