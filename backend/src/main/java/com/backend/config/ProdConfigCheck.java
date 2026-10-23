package com.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * With the prod profile (Railway sets SPRING_PROFILES_ACTIVE=prod) the app
 * refuses to start on a development setup: JWT_SECRET missing or equal to
 * the default in application.properties, CORS_ALLOWED_ORIGINS empty or
 * pointing at localhost.
 */
@Slf4j
@Component
@Profile("prod")
public class ProdConfigCheck implements InitializingBean {

    private static final Pattern DEFAULT_SECRET = Pattern.compile("^jwt\\.secret=\\$\\{JWT_SECRET:(.*)}\\s*$", Pattern.MULTILINE);

    @Value("${JWT_SECRET:}")
    private String envSecret;

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${cors.allowed-origins:}")
    private String corsOrigins;

    @Override
    public void afterPropertiesSet() {
        List<String> problems = problems(envSecret, jwtSecret, defaultSecret(), corsOrigins);
        if (!problems.isEmpty()) {
            String message = "Production config is not safe to start with: " + String.join("; ", problems);
            log.error(message);
            throw new IllegalStateException(message);
        }
        log.info("Production config check passed");
    }

    static List<String> problems(String envSecret, String jwtSecret, String defaultSecret, String corsOrigins) {
        List<String> out = new ArrayList<>();
        if (envSecret == null || envSecret.isBlank()) {
            out.add("JWT_SECRET is not set");
        } else if (defaultSecret != null && !defaultSecret.isBlank() && defaultSecret.equals(jwtSecret)) {
            out.add("JWT_SECRET equals the development default from application.properties");
        }
        String cors = corsOrigins == null ? "" : corsOrigins.strip();
        if (cors.isEmpty()) {
            out.add("CORS_ALLOWED_ORIGINS is empty");
        } else {
            String lower = cors.toLowerCase(Locale.ROOT);
            if (lower.contains("localhost") || lower.contains("127.0.0.1")) {
                out.add("CORS_ALLOWED_ORIGINS points at localhost (" + cors + ")");
            }
        }
        return out;
    }

    /** The fallback written in application.properties, read rather than copied here. */
    static String defaultSecret() {
        try (InputStream in = new ClassPathResource("application.properties").getInputStream()) {
            Matcher m = DEFAULT_SECRET.matcher(new String(in.readAllBytes(), StandardCharsets.UTF_8));
            return m.find() ? m.group(1).strip() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
