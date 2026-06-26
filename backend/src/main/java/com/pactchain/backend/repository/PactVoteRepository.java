package com.pactchain.backend.repository;

import com.pactchain.backend.model.PactVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PactVoteRepository extends JpaRepository<PactVote, Long> {
    List<PactVote> findByPactId(String pactId);
    Optional<PactVote> findByPactIdAndVoterWallet(String pactId, String voterWallet);
    boolean existsByPactIdAndVoterWallet(String pactId, String voterWallet);
}
