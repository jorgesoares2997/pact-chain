package com.pactchain.backend.controller;

import com.pactchain.backend.dto.CreatePactRequest;
import com.pactchain.backend.dto.CreatePactResponse;
import com.pactchain.backend.model.Pact;
import com.pactchain.backend.service.PactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/pacts")
@RequiredArgsConstructor
public class PactController {

    private final PactService pactService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreatePactResponse create(@Valid @RequestBody CreatePactRequest req) {
        return pactService.createPact(req);
    }

    @GetMapping("/{id}")
    public Pact get(@PathVariable String id) {
        return pactService.getPact(id);
    }

    @PatchMapping("/{id}/status")
    public Map<String, Boolean> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        var status = Pact.Status.valueOf(body.get("status").toUpperCase());
        pactService.updateStatus(id, status);
        return Map.of("ok", true);
    }

    @PatchMapping("/{id}/winner")
    public Map<String, Boolean> updateWinner(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        pactService.updateWinner(id, body.get("winner"));
        return Map.of("ok", true);
    }

    @PostMapping("/{id}/invite")
    public Map<String, String> createInvite(@PathVariable String id) {
        String code = pactService.createInviteForPact(id);
        return Map.of("code", code);
    }
}
