package com.backend;

import com.backend.controller.HealthController;
import com.backend.dto.LoginRequest;
import com.backend.exception.ApiException;
import com.backend.service.AuthService;
import com.backend.service.RoleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// /api/health answers without the database, /api/health/db checks it;
// sign-in stops after five wrong passwords for the same email.
@SpringBootTest
class HealthAndLoginTests {

    @Autowired private HealthController health;
    @Autowired private AuthService auth;
    @Autowired private RoleService roleService;

    @Test
    void healthAndDatabase() {
        assertEquals("ok", health.health().getBody().get("status"));
        assertNotNull(health.health().getBody().get("version"));
        assertEquals("ok", health.database().getBody().get("status"));
    }

    private LoginRequest login(String email, String password) {
        LoginRequest r = new LoginRequest();
        r.setEmail(email);
        r.setPassword(password);
        return r;
    }

    @Test
    void fiveWrongPasswordsLockTheEmail() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        String email = tag + "@example.test";
        roleService.createAccount("login-" + tag, email, "right-password-123");

        assertNotNull(auth.login(login(email, "right-password-123")).getToken());
        for (int i = 0; i < 5; i++) {
            RuntimeException e = assertThrows(RuntimeException.class, () -> auth.login(login(email, "wrong")));
            assertFalse(e instanceof ApiException, "plain «пропуск не опознан» until the limit");
        }
        ApiException locked = assertThrows(ApiException.class, () -> auth.login(login(email, "right-password-123")));
        assertEquals(429, locked.getStatus().value());

        // Unknown emails are throttled the same way.
        String ghost = "ghost-" + tag + "@example.test";
        for (int i = 0; i < 5; i++) assertThrows(RuntimeException.class, () -> auth.login(login(ghost, "x")));
        assertEquals(429, assertThrows(ApiException.class, () -> auth.login(login(ghost, "x"))).getStatus().value());
    }
}
