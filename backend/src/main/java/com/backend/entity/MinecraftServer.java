package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** Singleton row (fixed id) holding the current server's connection info. */
@Entity
@Table(name = "minecraft_server")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MinecraftServer {

    @Id
    @Builder.Default
    private String id = "minecraft";

    @Builder.Default
    private String ip = "play.example.net";

    @Builder.Default
    private int port = 25565;

    @Builder.Default
    private String version = "1.21";

    @Builder.Default
    private String motd = "Whenever the world needs saving.";

    @Builder.Default
    private String status = "unknown";

    /** Link to the shared Google Drive folder (maps, resource packs, builds). */
    @Column(name = "drive_url")
    private String driveUrl;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    @PrePersist
    protected void onSave() {
        updatedAt = LocalDateTime.now();
    }
}
