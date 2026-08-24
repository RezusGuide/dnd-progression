package com.backend.repository;

import com.backend.entity.PortfolioProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PortfolioProjectRepository extends JpaRepository<PortfolioProject, Long> {
    @Query("SELECT p FROM PortfolioProject p ORDER BY p.displayOrder ASC, p.id ASC")
    List<PortfolioProject> findAllOrdered();
}
