package com.pactchain.backend.dto;

import com.pactchain.backend.model.Pact;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreatePactRequest {

    @NotBlank
    private String contractId;

    @NotBlank
    @Size(max = 120)
    private String title;

    @Size(max = 1000)
    private String description;

    @NotBlank
    private String creator;

    @Positive
    private long stakeAmount;

    @Min(2) @Max(20)
    private int maxParticipants;

    @Positive
    private long deadline;

    @NotNull
    private Pact.ResolutionMode resolutionMode;

    private String judge;
}
