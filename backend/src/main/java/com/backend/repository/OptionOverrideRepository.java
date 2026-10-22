package com.backend.repository;

import com.backend.entity.OptionOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OptionOverrideRepository extends JpaRepository<OptionOverride, Long> {
    Optional<OptionOverride> findByKindAndKey(String kind, String key);
}
