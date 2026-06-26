package com.pactchain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "pact_votes")
@Data
@NoArgsConstructor
public class PactVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pact_id", nullable = false, length = 20)
    private String pactId;

    @Column(name = "voter_wallet", nullable = false, length = 80)
    private String voterWallet;

    @Column(name = "result_id", nullable = false)
    private Long resultId;

    @Column(name = "tx_hash", length = 128)
    private String txHash;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
