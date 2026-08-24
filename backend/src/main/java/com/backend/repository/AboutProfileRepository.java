package com.backend.repository;

import com.backend.entity.AboutProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AboutProfileRepository extends JpaRepository<AboutProfile, String> {
}
