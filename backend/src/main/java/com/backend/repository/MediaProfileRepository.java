package com.backend.repository;

import com.backend.entity.MediaProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MediaProfileRepository extends JpaRepository<MediaProfile, String> {
}
