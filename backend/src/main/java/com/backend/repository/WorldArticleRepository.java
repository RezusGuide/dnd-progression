package com.backend.repository;

import com.backend.entity.WorldArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorldArticleRepository extends JpaRepository<WorldArticle, Long> {
    Optional<WorldArticle> findBySlug(String slug);
    List<WorldArticle> findByStatusInOrderByTitleAsc(Collection<WorldArticle.Status> statuses);
    List<WorldArticle> findAllByOrderByTitleAsc();
}
