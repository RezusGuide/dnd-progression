package com.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.Set;

/**
 * A named bundle of section access, e.g. key="OWNER" sections=["*"], or
 * key="DND_ENJOYER" sections=["dnd"]. Batyr manages these (and who holds
 * them) from /admin. "*" in sections means "every section" (owner-level).
 */
@Entity
@Table(name = "roles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String key;

    @Column(nullable = false)
    private String label;

    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_sections", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "section")
    @Builder.Default
    private List<String> sections = List.of();

    @JsonIgnore
    @ManyToMany(mappedBy = "roles")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @Builder.Default
    private Set<User> users = Set.of();
}
