package com.backend.dto;

import lombok.Data;

@Data
public class ResetPasswordRequest {
    private String email;
    private String recoveryCode;
    private String newPassword;
}
