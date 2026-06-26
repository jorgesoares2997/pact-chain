package com.pactchain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "transactions")
@Data
@NoArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tx_hash", unique = true, length = 128)
    private String txHash;

    @Column(nullable = false, length = 80)
    private String wallet;

    @Column(name = "pact_id", length = 20)
    private String pactId;

    /** join, lock, vote, resolve, judge_resolve, refund */
    @Column(nullable = false, length = 40)
    private String action;

    @Column(nullable = false)
    private long amount = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
