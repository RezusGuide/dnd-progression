package com.backend;

import com.backend.controller.AuthController;
import com.backend.entity.User;
import com.backend.service.RoleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// GET /api/auth/setup-status flips from "no GM yet" to "GM exists" once
// someone claims ownership - that's what gates /admin?setup=1. Its own
// in-memory database: other tests make GMs (OWNER) freely.
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:setupdb;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;NON_KEYWORDS=KEY,VALUE")
class SetupStatusTests {

    @Autowired
    private AuthController authController;

    @Autowired
    private RoleService roleService;

    @Test
    void ownerExistsFlipsAfterBootstrap() {
        assertFalse(authController.setupStatus().getBody().get("ownerExists"));

        User user = roleService.createAccount("setup-test", "setup-test@example.test", "test-password-123");
        roleService.bootstrapOwner(user.getId());

        assertTrue(authController.setupStatus().getBody().get("ownerExists"));
        assertEquals(1, authController.setupStatus().getBody().size());
    }
}
