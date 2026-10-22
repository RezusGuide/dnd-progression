package com.backend.repository;

import com.backend.entity.SessionPoll;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SessionPollRepository extends JpaRepository<SessionPoll, Long> {
    List<SessionPoll> findAllByOrderByCreatedAtDesc();
    List<SessionPoll> findByParticipantsIdOrderByCreatedAtDesc(Long userId);
}
