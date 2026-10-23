package com.backend;

import com.backend.entity.User;
import com.backend.service.JwtService;
import com.backend.service.RoleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// Over real HTTP: a guest reads what is public, staff work with their own
// things, and every /api/admin/** answer is 403 for anyone but the GM.
// Its own in-memory database, so the web server's context never shares
// tables with the others.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:accessdb;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;NON_KEYWORDS=KEY,VALUE",
                // Base64 of a test-only phrase: JwtService decodes the key, the shared test value is not Base64.
                "jwt.secret=dGVzdC1vbmx5LWp3dC1zZWNyZXQtZm9yLWFjY2Vzcy10ZXN0cy0wMTIzNDU2Nzg5"
        })
class AccessTests {

    @Value("${local.server.port}")
    private int port;

    @Autowired private RoleService roleService;
    @Autowired private JwtService jwtService;

    private final HttpClient http = HttpClient.newHttpClient();

    private static final List<String> ADMIN_GETS = List.of(
            "/api/admin/summary", "/api/admin/staff", "/api/admin/log", "/api/admin/gm-note", "/api/admin/users",
            "/api/admin/requests", "/api/admin/research-notes", "/api/admin/chest", "/api/admin/item-templates",
            "/api/admin/world", "/api/admin/dreams", "/api/admin/dreams/next-number", "/api/admin/options");

    private User account() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return roleService.createAccount("acc-" + tag, tag + "@example.test", "test-password-123");
    }

    private String token(User u) {
        return jwtService.generateToken(u.getEmail(), u.getId());
    }

    private int call(String method, String path, String token, String json) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json")
                .method(method, json == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json));
        if (token != null) b.header("Authorization", "Bearer " + token);
        return http.send(b.build(), HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    @Test
    void staffGetForbiddenOnEveryAdminEndpoint() throws Exception {
        String member = token(account());
        for (String path : ADMIN_GETS) {
            assertEquals(403, call("GET", path, member, null), path);
        }
        assertEquals(403, call("POST", "/api/admin/staff/xp", member, "{\"characterIds\":[1],\"amount\":100}"));
        assertEquals(403, call("POST", "/api/admin/staff/inspiration", member, "{\"characterIds\":[1],\"value\":true}"));
        assertEquals(403, call("PUT", "/api/admin/gm-note", member, "{\"body\":\"x\"}"));
        assertEquals(403, call("POST", "/api/admin/users", member, "{\"username\":\"x\",\"email\":\"x@example.test\",\"password\":\"p\"}"));
        assertEquals(403, call("POST", "/api/admin/dreams", member, "{\"title\":\"x\"}"));
        assertEquals(403, call("POST", "/api/announcements", member, "{\"title\":\"x\",\"body\":\"y\"}"));
    }

    @Test
    void guestsReadPublicPagesOnly() throws Exception {
        assertEquals(200, call("GET", "/api/announcements", null, null));
        assertEquals(200, call("GET", "/api/data/races", null, null));
        assertEquals(200, call("GET", "/api/auth/setup-status", null, null));
        int admin = call("GET", "/api/admin/summary", null, null);
        assertTrue(admin == 401 || admin == 403, "guest on admin: " + admin);
        int world = call("GET", "/api/world", null, null);
        assertTrue(world == 401 || world == 403, "guest on the archive: " + world);
    }

    @Test
    void staffWorkWithTheirOwnThings() throws Exception {
        String member = token(account());
        assertEquals(200, call("GET", "/api/world", member, null));
        assertEquals(200, call("GET", "/api/dreams", member, null));
        assertEquals(200, call("GET", "/api/me/availability", member, null));
        assertEquals(200, call("GET", "/api/requests/mine", member, null));
    }

    @Test
    void theGmGetsEverything() throws Exception {
        User gm = roleService.assignRole(account().getId(), RoleService.OWNER_KEY);
        String token = token(gm);
        for (String path : ADMIN_GETS) {
            assertEquals(200, call("GET", path, token, null), path);
        }
        assertEquals(200, call("PUT", "/api/admin/gm-note", token, "{\"body\":\"Тестовая заметка\"}"));
    }
}
