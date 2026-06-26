package com.pactchain.backend.controller;

import com.pactchain.backend.dto.CreatePactRequest;
import com.pactchain.backend.dto.CreatePactResponse;
import com.pactchain.backend.model.Pact;
import com.pactchain.backend.model.PactParticipant;
import com.pactchain.backend.model.PactResult;
import com.pactchain.backend.service.PactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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

    @GetMapping
    public List<Pact> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "100") int limit) {
        Pact.Status s = (status != null) ? Pact.Status.valueOf(status.toUpperCase()) : null;
        return pactService.listPacts(s, limit);
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

    @GetMapping("/{id}/participants")
    public List<PactParticipant> getParticipants(@PathVariable String id) {
        return pactService.getParticipants(id);
    }

    @PostMapping("/{id}/participants")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Boolean> addParticipant(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        var pact = pactService.getPact(id);
        pactService.addParticipant(id, body.get("wallet"), pact.getStakeAmount(), body.get("txHash"));
        return Map.of("ok", true);
    }

    @GetMapping("/{id}/results")
    public List<PactResult> getResults(@PathVariable String id) {
        return pactService.getResults(id);
    }

    @PostMapping("/{id}/votes")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Boolean> recordVote(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        pactService.recordVote(id, body.get("voterWallet"), body.get("candidateWallet"), body.get("txHash"));
        return Map.of("ok", true);
    }

    @GetMapping("/{id}/votes/check")
    public Map<String, Boolean> hasVoted(
            @PathVariable String id,
            @RequestParam String wallet) {
        return Map.of("voted", pactService.hasVoted(id, wallet));
    }
}
