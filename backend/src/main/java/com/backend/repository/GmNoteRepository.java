package com.backend.repository;

import com.backend.entity.GmNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GmNoteRepository extends JpaRepository<GmNote, Long> {
}
