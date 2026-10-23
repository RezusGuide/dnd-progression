package com.backend.service;

import com.backend.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Brakes on password guessing: 5 failed sign-ins for one email within 10
 * minutes lock that email for 10 minutes (429). Kept in memory only - a
 * restart clears it, which is fine for a home-hosted server.
 */
@Component
public class LoginThrottle {

    public static final int MAX_FAILURES = 5;
    public static final Duration WINDOW = Duration.ofMinutes(10);
    public static final Duration LOCK = Duration.ofMinutes(10);
    static final int PRUNE_AT = 1000;

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginThrottle() {
        this(Clock.systemUTC());
    }

    LoginThrottle(Clock clock) {
        this.clock = clock;
    }

    private static final class Entry {
        final Deque<Instant> failures = new ArrayDeque<>();
        Instant lockedUntil;
    }

    /** Throws 429 while the email is locked. */
    public void check(String email) {
        Entry e = entries.get(key(email));
        if (e == null) return;
        synchronized (e) {
            if (e.lockedUntil != null && e.lockedUntil.isAfter(clock.instant())) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Слишком много попыток. Подождите 10 минут.");
            }
        }
    }

    public void failed(String email) {
        Instant now = clock.instant();
        if (entries.size() >= PRUNE_AT) prune(now);
        Entry e = entries.computeIfAbsent(key(email), k -> new Entry());
        synchronized (e) {
            e.failures.addLast(now);
            while (!e.failures.isEmpty() && e.failures.peekFirst().isBefore(now.minus(WINDOW))) e.failures.removeFirst();
            if (e.failures.size() >= MAX_FAILURES) {
                e.lockedUntil = now.plus(LOCK);
                e.failures.clear();
            }
        }
    }

    public void succeeded(String email) {
        entries.remove(key(email));
    }

    /** Drops entries with no recent failures and no running lock. */
    void prune(Instant now) {
        entries.entrySet().removeIf(en -> {
            Entry e = en.getValue();
            synchronized (e) {
                boolean locked = e.lockedUntil != null && e.lockedUntil.isAfter(now);
                boolean recent = !e.failures.isEmpty() && e.failures.peekLast().isAfter(now.minus(WINDOW));
                return !locked && !recent;
            }
        });
    }

    int size() {
        return entries.size();
    }

    private static String key(String email) {
        return email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
    }
}
