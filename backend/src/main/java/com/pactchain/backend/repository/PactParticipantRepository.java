package com.pactchain.backend.repository;

import com.pactchain.backend.model.PactParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PactParticipantRepository extends JpaRepository<PactParticipant, Long> {
    List<PactParticipant> findByPactIdOrderByJoinedAtAsc(String pactId);
    Optional<PactParticipant> findByPactIdAndWallet(String pactId, String wallet);
    boolean existsByPactIdAndWallet(String pactId, String wallet);
    long countByPactId(String pactId);
}
