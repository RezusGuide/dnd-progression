package com.backend.dto;

import lombok.Data;

@Data
public class CharacterRequest {
    private String name;
    private String characterClass;
    private String race;
    private String backstory;
}