package com.backend.repository;

import com.backend.entity.GmActionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GmActionLogRepository extends JpaRepository<GmActionLog, Long> {
    Page<GmActionLog> findAllByOrderByAtDescIdDesc(Pageable page);
    Page<GmActionLog> findByActionOrderByAtDescIdDesc(String action, Pageable page);
}
