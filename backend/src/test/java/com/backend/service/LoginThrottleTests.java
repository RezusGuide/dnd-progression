package com.backend.service;

import com.backend.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;

// 5 failures in 10 minutes lock an email for 10 minutes; success clears it.
class LoginThrottleTests {

    private static final class MovableClock extends Clock {
        Instant now = Instant.parse("2026-10-23T12:00:00Z");
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
        void plus(Duration d) { now = now.plus(d); }
    }

    @Test
    void fiveFailuresLockForTenMinutes() {
        MovableClock clock = new MovableClock();
        LoginThrottle t = new LoginThrottle(clock);
        for (int i = 0; i < 4; i++) {
            t.check("Anya@Example.test");
            t.failed("anya@example.test");
        }
        t.check("anya@example.test"); // four failures: still allowed
        t.failed("ANYA@example.test");

        ApiException e = assertThrows(ApiException.class, () -> t.check("anya@example.test"));
        assertEquals(429, e.getStatus().value());
        assertEquals("Слишком много попыток. Подождите 10 минут.", e.getMessage());
        t.check("ivan@example.test"); // other emails are not affected

        clock.plus(Duration.ofMinutes(9));
        assertThrows(ApiException.class, () -> t.check("anya@example.test"));
        clock.plus(Duration.ofMinutes(1).plusSeconds(1));
        t.check("anya@example.test");
    }

    @Test
    void oldFailuresFallOutOfTheWindow() {
        MovableClock clock = new MovableClock();
        LoginThrottle t = new LoginThrottle(clock);
        for (int i = 0; i < 4; i++) t.failed("anya@example.test");
        clock.plus(Duration.ofMinutes(11));
        t.failed("anya@example.test");
        t.check("anya@example.test");
    }

    @Test
    void successClearsAndPruneDropsStaleEntries() {
        MovableClock clock = new MovableClock();
        LoginThrottle t = new LoginThrottle(clock);
        for (int i = 0; i < 4; i++) t.failed("anya@example.test");
        t.succeeded("anya@example.test");
        t.failed("anya@example.test");
        t.check("anya@example.test");

        t.failed("old@example.test");
        clock.plus(Duration.ofMinutes(30));
        t.prune(clock.instant());
        assertEquals(0, t.size());
    }
}
