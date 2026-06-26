package com.pactchain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "results")
@Data
@NoArgsConstructor
public class PactResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pact_id", nullable = false, length = 20)
    private String pactId;

    @Column(name = "candidate_wallet", nullable = false, length = 80)
    private String candidateWallet;

    @Column(length = 80)
    private String label;

    @Column(name = "total_votes", nullable = false)
    private int totalVotes = 0;

    @Column(name = "payout_multiplier", precision = 10, scale = 4)
    private BigDecimal payoutMultiplier;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
