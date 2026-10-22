package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * The GM's status override for one race or class: when a row exists it
 * wins over the status in data/races.json / classes.json.
 */
@Entity
@Table(name = "option_override", uniqueConstraints = @UniqueConstraint(columnNames = {"kind", "option_key"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptionOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // RACE or CLASS.
    @Column(nullable = false, length = 10)
    private String kind;

    @Column(name = "option_key", nullable = false, length = 80)
    private String key;

    // allowed | unlockable | undecided | closed | npc_only
    @Column(nullable = false, length = 20)
    private String status;
}
