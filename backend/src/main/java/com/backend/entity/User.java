package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    // Was serialized to clients wherever a User is nested in a response
    // (e.g. Campaign.owner) - @JsonIgnore keeps the bcrypt hash from ever
    // leaving the server.
    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // BCrypt hash of a self-service recovery code (see AuthService), null
    // until the user generates one. Single-use - cleared the moment it's
    // spent on a password reset, same as the plaintext code itself is
    // shown to the user exactly once and never stored.
    @JsonIgnore
    @Column(name = "recovery_code_hash")
    private String recoveryCodeHash;

    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Character> characters;

    // OWNER (the GM) and MEMBER. Loaded eagerly: every authenticated request
    // needs it to build authorities (see SecurityConfig's JWT filter).
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /** The GM: holds the OWNER role. Shown as "gm" in the accounts list. */
    public boolean isGm() {
        return roles.stream().anyMatch(r -> "OWNER".equals(r.getKey()));
    }
}
