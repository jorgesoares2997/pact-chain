package com.pactchain.backend.repository;

import com.pactchain.backend.model.ResolutionLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResolutionLogRepository extends JpaRepository<ResolutionLog, Long> {
    List<ResolutionLog> findByPactIdOrderByCreatedAtDesc(String pactId);
}
