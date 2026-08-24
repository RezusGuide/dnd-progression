package com.backend.repository;

import com.backend.entity.AspectRecipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AspectRecipeRepository extends JpaRepository<AspectRecipe, Long> {
    List<AspectRecipe> findAll();

    // Unordered lookup - a recipe's componentA/componentB pair is stored in
    // one fixed order (see DataSeeder), so check both orderings here rather
    // than at every call site.
    Optional<AspectRecipe> findByComponentAAndComponentB(String componentA, String componentB);
}
