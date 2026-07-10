package com.pactchain.backend.repository;

import com.pactchain.backend.model.WalletInteraction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WalletInteractionRepository extends JpaRepository<WalletInteraction, Long> {
    List<WalletInteraction> findByWalletOrderByCreatedAtDesc(String wallet, Pageable pageable);
    List<WalletInteraction> findByPactIdOrderByCreatedAtDesc(String pactId, Pageable pageable);
    List<WalletInteraction> findByPactIdAndWalletOrderByCreatedAtDesc(String pactId, String wallet, Pageable pageable);
    List<WalletInteraction> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
