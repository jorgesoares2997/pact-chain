package com.pactchain.backend.service;

import com.pactchain.backend.dto.CreatePactRequest;
import com.pactchain.backend.dto.CreatePactResponse;
import com.pactchain.backend.exception.ResourceNotFoundException;
import com.pactchain.backend.model.InviteLink;
import com.pactchain.backend.model.Pact;
import com.pactchain.backend.model.WalletInteraction;
import com.pactchain.backend.repository.InviteLinkRepository;
import com.pactchain.backend.repository.PactRepository;
import com.pactchain.backend.repository.WalletInteractionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PactService {

    private final PactRepository pactRepo;
    private final InviteLinkRepository inviteRepo;
    private final WalletInteractionRepository interactionRepo;

    @Value("${pactchain.cors.allowed-origins:http://localhost:3000}")
    private String frontendUrl;

    @Transactional
    public CreatePactResponse createPact(CreatePactRequest req) {
        var pact = new Pact();
        pact.setId(shortId());
        pact.setContractId(req.getContractId());
        pact.setTitle(req.getTitle());
        pact.setDescription(req.getDescription());
        pact.setCreator(req.getCreator());
        pact.setStakeAmount(req.getStakeAmount());
        pact.setMaxParticipants(req.getMaxParticipants());
        pact.setDeadline(req.getDeadline());
        pact.setResolutionMode(req.getResolutionMode());
        pact.setJudge(req.getJudge());

        if (req.getVoteOptions() != null && req.getVoteOptions().size() >= 2) {
            pact.setVoteOptions(String.join(",", req.getVoteOptions()));
        }

        pactRepo.save(pact);

        var code = generateInvite(pact);
        logInteraction(req.getCreator(), "pact_created", pact.getId(), pact.getTitle(), null);

        return new CreatePactResponse(pact.getId(), code, frontendUrl + "/join/" + code);
    }

    public Pact getPact(String id) {
        return pactRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pact not found: " + id));
    }

    public List<Pact> listPacts(Pact.Status status, int limit) {
        var page = PageRequest.of(0, limit);
        if (status != null) return pactRepo.findByStatusOrderByCreatedAtDesc(status, page);
        return pactRepo.findAllByOrderByCreatedAtDesc(page);
    }

    @Transactional
    public void updateStatus(String id, Pact.Status status) {
        var pact = getPact(id);
        pact.setStatus(status);
        pactRepo.save(pact);
    }

    @Transactional
    public void updateWinner(String id, String winner) {
        var pact = getPact(id);
        pact.setWinner(winner);
        pact.setStatus(Pact.Status.RESOLVED);
        pactRepo.save(pact);
    }

    public Pact resolveInvite(String code) {
        var link = inviteRepo.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid invite code: " + code));
        return link.getPact();
    }

    @Transactional
    public String createInviteForPact(String pactId) {
        var pact = getPact(pactId);
        return generateInvite(pact);
    }

    public void logInteraction(String wallet, String action, String pactId, String pactTitle, String meta) {
        var i = new WalletInteraction();
        i.setWallet(wallet);
        i.setAction(action);
        i.setPactId(pactId);
        i.setPactTitle(pactTitle);
        i.setMeta(meta);
        interactionRepo.save(i);
    }

    public List<WalletInteraction> getAllInteractions(int limit) {
        return interactionRepo.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit));
    }

    public List<WalletInteraction> getInteractionsByWallet(String wallet, int limit) {
        return interactionRepo.findByWalletOrderByCreatedAtDesc(wallet, PageRequest.of(0, limit));
    }

    public List<WalletInteraction> getInteractionsByPact(String pactId, int limit) {
        return interactionRepo.findByPactIdOrderByCreatedAtDesc(pactId, PageRequest.of(0, limit));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private String generateInvite(Pact pact) {
        var link = new InviteLink();
        link.setCode(shortId(8));
        link.setPact(pact);
        inviteRepo.save(link);
        return link.getCode();
    }

    private static String shortId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private static String shortId(int len) {
        return UUID.randomUUID().toString().replace("-", "").substring(0, len);
    }
}
