package com.pactchain.backend.repository;

import com.pactchain.backend.model.PactResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PactResultRepository extends JpaRepository<PactResult, Long> {
    List<PactResult> findByPactIdOrderByTotalVotesDesc(String pactId);
    Optional<PactResult> findByPactIdAndCandidateWallet(String pactId, String candidateWallet);
    boolean existsByPactIdAndCandidateWallet(String pactId, String candidateWallet);
}
