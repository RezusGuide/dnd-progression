package com.backend.repository;

import com.backend.entity.ItemTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemTemplateRepository extends JpaRepository<ItemTemplate, Long> {
    List<ItemTemplate> findAllByOrderByNameAsc();
}
