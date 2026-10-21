package com.backend.service;

import com.backend.dto.AuthResponse;
import com.backend.dto.LoginRequest;
import com.backend.entity.User;
import com.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.List;

// No self-registration here anymore - accounts only get created through
// RoleService.createAccount (owner-only, via /api/admin/users). See
// AuthController for why.
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Пропуск не опознан. Проверьте почту и пароль."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Пропуск не опознан. Проверьте почту и пароль.");
        }

        return buildResponse(user);
    }

    /** Re-reads the current user (fresh roles) for session rehydration. */
    public AuthResponse me(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пропуск не найден."));
        String token = jwtService.generateToken(user.getEmail(), user.getId());
        return buildResponse(user, token);
    }

    // Self-service account recovery, infrastructure-free (no email sending
    // in this app) - a user generates a code while still logged in, writes
    // it down, and can use it later instead of asking the owner to reset
    // their password. The owner's own account is exactly who this matters
    // most for, since nobody else can reset the owner's password.
    private static final int RECOVERY_CODE_GROUPS = 4;
    private static final int RECOVERY_CODE_GROUP_LENGTH = 4;
    // Excludes visually ambiguous characters (0/O, 1/I/L).
    private static final String RECOVERY_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private final SecureRandom secureRandom = new SecureRandom();

    /** Generates and stores (hashed) a new recovery code, returning the plaintext once. */
    public String generateRecoveryCode(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пропуск не найден."));
        String code = randomRecoveryCode();
        user.setRecoveryCodeHash(passwordEncoder.encode(code));
        userRepository.save(user);
        return code;
    }

    /** Resets a password using a previously generated recovery code; the code is consumed either way. */
    public void resetPasswordWithRecoveryCode(String email, String recoveryCode, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Почта или код не подходят."));
        if (user.getRecoveryCodeHash() == null || recoveryCode == null
                || !passwordEncoder.matches(recoveryCode, user.getRecoveryCodeHash())) {
            throw new RuntimeException("Почта или код не подходят.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setRecoveryCodeHash(null); // single-use
        userRepository.save(user);
    }

    private String randomRecoveryCode() {
        StringBuilder sb = new StringBuilder();
        for (int group = 0; group < RECOVERY_CODE_GROUPS; group++) {
            if (group > 0) sb.append('-');
            for (int i = 0; i < RECOVERY_CODE_GROUP_LENGTH; i++) {
                sb.append(RECOVERY_CODE_ALPHABET.charAt(secureRandom.nextInt(RECOVERY_CODE_ALPHABET.length())));
            }
        }
        return sb.toString();
    }

    private AuthResponse buildResponse(User user) {
        String token = jwtService.generateToken(user.getEmail(), user.getId());
        return buildResponse(user, token);
    }

    private AuthResponse buildResponse(User user, String token) {
        List<String> roleKeys = user.getRoles().stream().map(r -> r.getKey()).sorted().toList();
        List<String> sections = user.getSectionKeys().stream().sorted().toList();
        return new AuthResponse(token, user.getUsername(), user.getId(), roleKeys, sections);
    }
}
