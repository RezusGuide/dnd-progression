package com.backend.repository;

import com.backend.entity.MinecraftServer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MinecraftServerRepository extends JpaRepository<MinecraftServer, String> {
}
