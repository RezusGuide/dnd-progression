package com.backend.dto;

import com.backend.research.Placement;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/** Body of PUT .../draft and POST .../notes: the aspects the player placed. */
@Data
public class ResearchGridRequest {
    private List<Placement> placed = new ArrayList<>();
}
