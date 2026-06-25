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

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Transient
    public List<String> getVoteOptionList() {
        if (voteOptions == null || voteOptions.isBlank()) return List.of("Yes", "No");
        return Arrays.asList(voteOptions.split(","));
    }
}
