package com.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AspectCraftResponse {
    private boolean success;
    private String resultAspect; // null when success is false
    private String message;
}
