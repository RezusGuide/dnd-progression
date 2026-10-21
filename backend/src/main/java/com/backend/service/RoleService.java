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

    public Role createRole(String key, String label, String description, List<String> sections) {
        String normalizedKey = key.trim().toUpperCase().replace(' ', '_');
        if (roleRepository.existsByKey(normalizedKey)) {
            throw new RuntimeException("A role with that key already exists");
        }
        Role role = Role.builder()
                .key(normalizedKey)
                .label(label)
                .description(description)
                .sections(sections)
                .build();
        return roleRepository.save(role);
    }

    @Transactional
    public User assignRole(Long userId, String roleKey) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Role role = roleRepository.findByKey(roleKey)
                .orElseThrow(() -> new RuntimeException("Role not found"));
        user.getRoles().add(role);
        return userRepository.save(user);
    }

    @Transactional
    public User revokeRole(Long userId, String roleKey) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Role role = roleRepository.findByKey(roleKey)
                .orElseThrow(() -> new RuntimeException("Role not found"));
        user.getRoles().remove(role);
        return userRepository.save(user);
    }

    /**
     * Every account - self-registered or admin-created - gets MEMBER
     * (dnd) automatically. There's no per-friend section
     * picking: you either have an account or you don't.
     */
    @Transactional
    public void grantDefaultMemberRole(User user) {
        Role member = roleRepository.findByKey(MEMBER_KEY)
                .orElseGet(() -> roleRepository.save(
                        Role.builder()
                                .key(MEMBER_KEY)
                                .label("Member")
                                .description("Standard account access: D&D.")
                                .sections(List.of("dnd"))
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
            throw new RuntimeException("Email already in use");
        }
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already taken");
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
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        return userRepository.save(user);
    }

    /**
     * One-time bootstrap: the first person to call this while no one holds
     * OWNER yet becomes the owner. Refuses once an owner exists - after
     * that, role assignment goes through the normal admin endpoints (which
     * require being an owner already).
     */
    @Transactional
    public User bootstrapOwner(Long userId) {
        boolean ownerExists = roleRepository.findByKey(OWNER_KEY)
                .map(r -> !r.getUsers().isEmpty())
                .orElse(false);
        if (ownerExists) {
            throw new RuntimeException("An owner is already set for this site");
        }
        Role owner = roleRepository.findByKey(OWNER_KEY)
                .orElseGet(() -> roleRepository.save(
                        Role.builder()
                                .key(OWNER_KEY)
                                .label("Owner")
                                .description("Full access to every section and the admin panel.")
                                .sections(List.of("*"))
                                .build()
                ));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.getRoles().add(owner);
        return userRepository.save(user);
    }
}
