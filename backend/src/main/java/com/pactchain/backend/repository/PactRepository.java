package com.pactchain.backend.repository;

import com.pactchain.backend.model.Pact;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PactRepository extends JpaRepository<Pact, String> {
    List<Pact> findByStatusOrderByCreatedAtDesc(Pact.Status status, Pageable pageable);
    List<Pact> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
