package com.pactchain.backend.controller;

import com.pactchain.backend.model.Pact;
import com.pactchain.backend.service.PactService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/invite")
@RequiredArgsConstructor
public class InviteController {

    private final PactService pactService;

    @GetMapping("/{code}")
    public Pact resolve(@PathVariable String code) {
        return pactService.resolveInvite(code);
    }
}
