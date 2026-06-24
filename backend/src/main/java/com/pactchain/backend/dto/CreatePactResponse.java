package com.pactchain.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CreatePactResponse {
    private String id;
    private String code;
    private String inviteUrl;
}
