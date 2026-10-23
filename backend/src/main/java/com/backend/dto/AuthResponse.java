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
    /** Role keys this user holds: ["MEMBER"], ["MEMBER", "OWNER"]. */
    private List<String> roles;
    /** The GM (holds OWNER). */
    private boolean gm;
}
