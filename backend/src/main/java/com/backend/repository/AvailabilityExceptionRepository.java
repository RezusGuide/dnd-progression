package com.backend.repository;

import com.backend.entity.AvailabilityException;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface AvailabilityExceptionRepository extends JpaRepository<AvailabilityException, Long> {
    List<AvailabilityException> findByUserIdOrderByDateAsc(Long userId);
    List<AvailabilityException> findByUserIdIn(Collection<Long> userIds);
}
