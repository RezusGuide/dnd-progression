package com.backend.repository;

import com.backend.entity.DreamCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DreamCaseRepository extends JpaRepository<DreamCase, Long> {
    List<DreamCase> findAllByOrderByNumberDesc();

    @Query("select coalesce(max(d.number), 0) from DreamCase d")
    int maxNumber();

    boolean existsByNumber(Integer number);

    long countByStatus(DreamCase.Status status);
}
