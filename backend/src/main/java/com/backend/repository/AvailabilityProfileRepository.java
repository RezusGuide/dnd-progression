package com.backend.repository;

import com.backend.entity.AvailabilityProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AvailabilityProfileRepository extends JpaRepository<AvailabilityProfile, Long> {
    Optional<AvailabilityProfile> findByUserId(Long userId);
    List<AvailabilityProfile> findByUserIdIn(Collection<Long> userIds);
}
