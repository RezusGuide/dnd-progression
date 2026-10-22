package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * A campaign condition that opens "unlockable" races or classes. The key is
 * neutral (it is in the public repository); what it means lives only in
 * gmLabel, which only the GM sees.
 */
@Entity
@Table(name = "unlock_flag")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnlockFlag {

    @Id
    @Column(name = "flag_key", length = 80)
    private String key;

    @Column(name = "gm_label", columnDefinition = "TEXT")
    private String gmLabel;

    @Column(nullable = false)
    @Builder.Default
    private boolean unlocked = false;
}
