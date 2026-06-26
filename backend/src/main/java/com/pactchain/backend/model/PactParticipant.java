package com.pactchain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "pact_participants")
@Data
@NoArgsConstructor
public class PactParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pact_id", nullable = false, length = 20)
    private String pactId;

    @Column(nullable = false, length = 80)
    private String wallet;

    @Column(name = "stake_amount", nullable = false)
    private long stakeAmount;

    @Column(name = "tx_hash", length = 128)
    private String txHash;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;
}
