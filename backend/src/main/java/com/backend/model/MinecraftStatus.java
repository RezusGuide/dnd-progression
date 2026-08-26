package com.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MinecraftStatus {
    private boolean online;
    private Integer playersOnline;
    private Integer playersMax;
    private String motd;
    private String version;

    public static MinecraftStatus offline() {
        return MinecraftStatus.builder().online(false).build();
    }
}
