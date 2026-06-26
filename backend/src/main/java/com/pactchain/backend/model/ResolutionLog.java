package com.pactchain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "resolution_logs")
@Data
@NoArgsConstructor
public class ResolutionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pact_id", nullable = false, length = 20)
    private String pactId;

    @Column(name = "resolver_wallet", nullable = false, length = 80)
    private String resolverWallet;

    /** MAJORITY, UNANIMITY, JUDGE, REFUND */
    @Column(name = "resolution_type", nullable = false, length = 20)
    private String resolutionType;

    @Column(name = "winning_result_id")
    private Long winningResultId;

    @Column(name = "tx_hash", length = 128)
    private String txHash;

    @Column(length = 500)
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
