package com.pactchain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Entity
@Table(name = "pacts")
@Data
@NoArgsConstructor
public class Pact {

    public enum Status { OPEN, ACTIVE, RESOLVED, REFUNDED }
    public enum ResolutionMode { MAJORITY, JUDGE, UNANIMITY }
    public enum PactType { OPINION, COMMITMENT }

    @Id
    private String id;

    @Column(name = "contract_id", unique = true)
    private String contractId;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false, length = 80)
    private String creator;

    @Column(name = "stake_amount", nullable = false)
    private long stakeAmount;

    @Column(name = "max_participants", nullable = false)
    private int maxParticipants;

    @Column(nullable = false)
    private long deadline;

    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_mode", nullable = false, length = 20)
    private ResolutionMode resolutionMode;

    @Column(length = 80)
    private String judge;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.OPEN;

    @Column(length = 80)
    private String winner;

    /** Comma-separated vote option labels, e.g. "Yes,No" or "Alice,Bob,Draw" */
    @Column(name = "vote_options", nullable = false, length = 500)
    private String voteOptions = "Yes,No";

    @Enumerated(EnumType.STRING)
    @Column(name = "pact_type", nullable = false, length = 20)
    private PactType pactType = PactType.OPINION;

    @Column(name = "success_criteria", columnDefinition = "TEXT")
    private String successCriteria;

    @Column(name = "evidence_requirements", length = 200)
    private String evidenceRequirements;

    @Column(name = "category_id")
    private Integer categoryId;

    @Column(name = "total_locked_value", nullable = false)
    private long totalLockedValue = 0;

    /** FK to results.id — set after resolution */
    @Column(name = "winning_result_id")
    private Long winningResultId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Transient
    public List<String> getVoteOptionList() {
        if (voteOptions == null || voteOptions.isBlank()) return List.of("Yes", "No");
        return Arrays.asList(voteOptions.split(","));
    }
}
