package com.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String username;
    private Long userId;
    /** Role keys this user holds, e.g. ["OWNER"] or ["DND_ENJOYER"]. */
    private List<String> roles;
    /** Flattened section keys those roles unlock. "*" means everything. */
    private List<String> sections;
}
