package com.backend.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * One compound-aspect recipe, transcribed from the Thaumcraft 4 aspect
 * chart: componentA + componentB (unordered - A+B and B+A are the same
 * recipe) combine into resultAspect. Reference data, seeded once by
 * DataSeeder, never player- or DM-editable at runtime.
 */
@Entity
@Table(name = "aspect_recipes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AspectRecipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "result_aspect", nullable = false, unique = true)
    private String resultAspect;

    @Column(name = "component_a", nullable = false)
    private String componentA;

    @Column(name = "component_b", nullable = false)
    private String componentB;
}
