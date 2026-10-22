package com.backend.repository;

import com.backend.entity.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameSessionRepository extends JpaRepository<GameSession, Long> {
    List<GameSession> findAllByOrderByStartUtcAsc();
}
