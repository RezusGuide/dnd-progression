package com.backend.service;

import com.backend.entity.Role;
import com.backend.entity.User;
import com.backend.repository.RoleRepository;
import com.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleService {

    public static final String OWNER_KEY = "OWNER";
    public static final String MEMBER_KEY = "MEMBER";

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<Role> listRoles() {
        return roleRepository.findAll();
    }

    public List<User> listUsers() {
        return userRepository.findAll();
    }

    /** OWNER or MEMBER only; there are no other roles any more. */
    @Transactional
    public User assignRole(Long userId, String roleKey) {
        if (!OWNER_KEY.equals(roleKey) && !MEMBER_KEY.equals(roleKey)) {
            throw new RuntimeException("Роли — только ГМ и сотрудник.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пропуск не найден."));
        Role role = roleRepository.findByKey(roleKey)
                .orElseThrow(() -> new RuntimeException("Роль не найдена."));
        user.getRoles().add(role);
        return userRepository.save(user);
    }

    /** Every account gets MEMBER automatically. */
    @Transactional
    public void grantDefaultMemberRole(User user) {
        Role member = roleRepository.findByKey(MEMBER_KEY)
                .orElseGet(() -> roleRepository.save(
                        Role.builder()
                                .key(MEMBER_KEY)
                                .label("Member")
                                .description("Staff account.")
                                .build()
                ));
        user.getRoles().add(member);
    }

    /**
     * Owner-only: create an account directly for a friend instead of them
     * self-registering, so you can hand them a login you chose.
     */
    @Transactional
    public User createAccount(String username, String email, String password) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Эта почта уже занята.");
        }
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Это имя уже занято.");
        }
        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .build();
        grantDefaultMemberRole(user);
        return userRepository.save(user);
    }

    @Transactional
    public User resetPassword(Long userId, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пропуск не найден."));
        user.setPassword(passwordEncoder.encode(newPassword));
        return userRepository.save(user);
    }

    /**
     * One-time bootstrap: the first person to call this while no one holds
     * OWNER yet becomes the owner. Refuses once an owner exists - after
     * that, role assignment goes through the normal admin endpoints (which
     * require being an owner already).
     */
    @Transactional(readOnly = true)
    public boolean ownerExists() {
        return roleRepository.findByKey(OWNER_KEY)
                .map(r -> !r.getUsers().isEmpty())
                .orElse(false);
    }

    @Transactional
    public User bootstrapOwner(Long userId) {
        if (ownerExists()) {
            throw new RuntimeException("ГМ уже назначен.");
        }
        Role owner = roleRepository.findByKey(OWNER_KEY)
                .orElseGet(() -> roleRepository.save(
                        Role.builder()
                                .key(OWNER_KEY)
                                .label("Owner")
                                .description("The GM.")
                                .build()
                ));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пропуск не найден."));
        user.getRoles().add(owner);
        return userRepository.save(user);
    }
}
