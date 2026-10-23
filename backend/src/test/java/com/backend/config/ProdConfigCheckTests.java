package com.backend.config;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

// The prod profile refuses development settings (ProdConfigCheck).
class ProdConfigCheckTests {

    private static final String DEFAULT = "dev-default-value";

    @Test
    void aProperSetupPasses() {
        assertEquals(List.of(), ProdConfigCheck.problems("real-secret", "real-secret", DEFAULT, "https://site.example", "https://site.example"));
    }

    @Test
    void missingOrDefaultSecretFails() {
        assertTrue(ProdConfigCheck.problems("", DEFAULT, DEFAULT, "https://site.example", "https://site.example").get(0).contains("JWT_SECRET is not set"));
        assertTrue(ProdConfigCheck.problems(null, DEFAULT, DEFAULT, "https://site.example", "https://site.example").get(0).contains("not set"));
        assertTrue(ProdConfigCheck.problems(DEFAULT, DEFAULT, DEFAULT, "https://site.example", "https://site.example").get(0).contains("development default"));
    }

    @Test
    void localOrEmptyCorsFails() {
        assertTrue(ProdConfigCheck.problems("s", "s", DEFAULT, "", "https://site.example").get(0).contains("empty"));
        assertTrue(ProdConfigCheck.problems("s", "s", DEFAULT, "https://site.example,http://localhost:5173", "https://site.example").get(0).contains("localhost"));
        assertTrue(ProdConfigCheck.problems("s", "s", DEFAULT, "http://127.0.0.1:5173", "https://site.example").get(0).contains("localhost"));
        assertEquals(2, ProdConfigCheck.problems(null, null, DEFAULT, null, "https://site.example").size());
    }

    @Test
    void placeholdersFromTheTemplateFail() {
        List<String> p = ProdConfigCheck.problems("s", "s", DEFAULT, "https://<сайт>.vercel.app", "https://<сайт>.vercel.app");
        assertTrue(p.contains("В настройках осталась заглушка из шаблона: CORS_ALLOWED_ORIGINS"), p.toString());
        assertTrue(p.contains("В настройках осталась заглушка из шаблона: SITE_URL"), p.toString());
        assertEquals(List.of("В настройках осталась заглушка из шаблона: JWT_SECRET"),
                ProdConfigCheck.problems("<Base64-строка>", "<Base64-строка>", DEFAULT, "https://site.example", "https://site.example"));
    }

    @Test
    void theDefaultIsReadFromTheRealPropertiesFile() throws Exception {
        // The check finds the fallback by this pattern; keep application.properties in that shape.
        String props = Files.readString(Path.of("src", "main", "resources", "application.properties"));
        assertTrue(Pattern.compile("^jwt\\.secret=\\$\\{JWT_SECRET:.+}\\s*$", Pattern.MULTILINE).matcher(props).find());
    }
}
