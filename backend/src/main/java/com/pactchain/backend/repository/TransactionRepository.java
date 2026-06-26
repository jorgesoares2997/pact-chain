package com.pactchain.backend.repository;

import com.pactchain.backend.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByWalletOrderByCreatedAtDesc(String wallet);
    List<Transaction> findByPactIdOrderByCreatedAtAsc(String pactId);
}
