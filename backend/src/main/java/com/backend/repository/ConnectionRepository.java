package com.backend.repository;

import com.backend.entity.Connection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConnectionRepository extends JpaRepository<Connection, Long> {
    List<Connection> findByPersonAIdOrPersonBId(Long personAId, Long personBId);
}
