package com.pactchain.backend.controller;

import com.pactchain.backend.dto.LogInteractionRequest;
import com.pactchain.backend.model.WalletInteraction;
import com.pactchain.backend.service.PactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/interactions")
@RequiredArgsConstructor
public class InteractionController {

    private final PactService pactService;

    @PostMapping
    public Map<String, Boolean> log(@Valid @RequestBody LogInteractionRequest req) {
        pactService.logInteraction(req.getWallet(), req.getAction(), req.getPactId(), req.getMeta());
        return Map.of("ok", true);
    }

    @GetMapping
    public List<WalletInteraction> list(
            @RequestParam(required = false) String wallet,
            @RequestParam(required = false) String pactId,
            @RequestParam(defaultValue = "50") int limit) {
        if (wallet != null) return pactService.getInteractionsByWallet(wallet, limit);
        if (pactId != null) return pactService.getInteractionsByPact(pactId, limit);
        return List.of();
    }
}
