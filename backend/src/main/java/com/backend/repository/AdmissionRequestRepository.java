package com.backend.repository;

import com.backend.entity.AdmissionRequest;
import com.backend.entity.ApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdmissionRequestRepository extends JpaRepository<AdmissionRequest, Long> {
    List<AdmissionRequest> findByStatusOrderByCreatedAtAsc(ApprovalStatus status);
    List<AdmissionRequest> findTop50ByStatusNotOrderByDecidedAtDesc(ApprovalStatus status);
    List<AdmissionRequest> findByCharacterIdOrderByCreatedAtDesc(Long characterId);
    List<AdmissionRequest> findTop20ByCharacterUserIdOrderByCreatedAtDesc(Long userId);
    boolean existsByCharacterIdAndStatus(Long characterId, ApprovalStatus status);
    void deleteByCharacterId(Long characterId);
}
