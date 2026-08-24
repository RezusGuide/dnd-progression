package com.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class Spell {
    private String id;
    private String name;
    private int level;
    private String aspectShape;
    private SpellStats stats;
    private List<GridAnchor> arcaneSignature;
}
