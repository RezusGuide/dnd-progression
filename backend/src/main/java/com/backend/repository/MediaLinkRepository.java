package com.backend.repository;

import com.backend.entity.MediaLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MediaLinkRepository extends JpaRepository<MediaLink, Long> {
    @Query("SELECT m FROM MediaLink m ORDER BY m.displayOrder ASC, m.id ASC")
    List<MediaLink> findAllOrdered();
}
