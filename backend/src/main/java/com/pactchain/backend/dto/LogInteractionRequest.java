package com.pactchain.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LogInteractionRequest {
    @NotBlank
    private String wallet;
    @NotBlank
    private String action;
    private String pactId;
    private String pactTitle;
    private String meta;
}
