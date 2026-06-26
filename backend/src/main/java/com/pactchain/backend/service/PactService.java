package com.pactchain.backend.service;

import com.pactchain.backend.dto.CreatePactRequest;
import com.pactchain.backend.dto.CreatePactResponse;
import com.pactchain.backend.exception.ResourceNotFoundException;
import com.pactchain.backend.model.*;
import com.pactchain.backend.repository.*;
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
    private final PactResultRepository resultRepo;
    private final PactParticipantRepository participantRepo;
    private final PactVoteRepository voteRepo;
    private final TransactionRepository txRepo;
    private final ResolutionLogRepository resolutionLogRepo;

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
        pact.setCategoryId(req.getCategoryId());

        if (req.getVoteOptions() != null && req.getVoteOptions().size() >= 2) {
            pact.setVoteOptions(String.join(",", req.getVoteOptions()));
        }

        pactRepo.save(pact);

        // Add creator as first participant
        addParticipant(pact.getId(), req.getCreator(), pact.getStakeAmount(), null);

        // Seed result rows from vote options so votes can reference them
        for (String option : pact.getVoteOptionList()) {
            if (!resultRepo.existsByPactIdAndCandidateWallet(pact.getId(), option)) {
                var result = new PactResult();
                result.setPactId(pact.getId());
                result.setCandidateWallet(option);
                result.setLabel(option);
                resultRepo.save(result);
            }
        }

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
        // Link winning_result_id if the winner matches a result row
        resultRepo.findByPactIdAndCandidateWallet(id, winner)
                .ifPresent(r -> pact.setWinningResultId(r.getId()));
        pactRepo.save(pact);
    }

    @Transactional
    public void addParticipant(String pactId, String wallet, long stakeAmount, String txHash) {
        if (!participantRepo.existsByPactIdAndWallet(pactId, wallet)) {
            var p = new PactParticipant();
            p.setPactId(pactId);
            p.setWallet(wallet);
            p.setStakeAmount(stakeAmount);
            p.setTxHash(txHash);
            participantRepo.save(p);
        }
        // Update total_locked_value; auto-activate when ≥2 participants
        var pact = getPact(pactId);
        long count = participantRepo.countByPactId(pactId);
        pact.setTotalLockedValue(count * pact.getStakeAmount());
        if (pact.getStatus() == Pact.Status.OPEN && count >= 2) {
            pact.setStatus(Pact.Status.ACTIVE);
        }
        pactRepo.save(pact);

        // Ensure a result row exists for this wallet (for MAJORITY/UNANIMITY voting)
        if (!resultRepo.existsByPactIdAndCandidateWallet(pactId, wallet)) {
            var result = new PactResult();
            result.setPactId(pactId);
            result.setCandidateWallet(wallet);
            result.setLabel(wallet.substring(0, 6) + "…" + wallet.substring(wallet.length() - 4));
            resultRepo.save(result);
        }
    }

    @Transactional
    public void recordVote(String pactId, String voterWallet, String candidateWallet, String txHash) {
        var result = resultRepo.findByPactIdAndCandidateWallet(pactId, candidateWallet)
                .orElseGet(() -> {
                    var r = new PactResult();
                    r.setPactId(pactId);
                    r.setCandidateWallet(candidateWallet);
                    r.setLabel(candidateWallet.substring(0, 6) + "…" + candidateWallet.substring(candidateWallet.length() - 4));
                    return resultRepo.save(r);
                });

        if (!voteRepo.existsByPactIdAndVoterWallet(pactId, voterWallet)) {
            var vote = new PactVote();
            vote.setPactId(pactId);
            vote.setVoterWallet(voterWallet);
            vote.setResultId(result.getId());
            vote.setTxHash(txHash);
            voteRepo.save(vote);

            result.setTotalVotes(result.getTotalVotes() + 1);
            resultRepo.save(result);
        }
    }

    @Transactional
    public void recordResolution(String pactId, String resolverWallet, String resolutionType,
                                  String winnerWallet, String txHash, String notes) {
        Long winningResultId = null;
        if (winnerWallet != null) {
            var result = resultRepo.findByPactIdAndCandidateWallet(pactId, winnerWallet).orElse(null);
            if (result != null) winningResultId = result.getId();
        }

        var log = new ResolutionLog();
        log.setPactId(pactId);
        log.setResolverWallet(resolverWallet);
        log.setResolutionType(resolutionType);
        log.setWinningResultId(winningResultId);
        log.setTxHash(txHash);
        log.setNotes(notes);
        resolutionLogRepo.save(log);
    }

    @Transactional
    public void recordTransaction(String wallet, String pactId, String action, long amount, String txHash) {
        var tx = new Transaction();
        tx.setWallet(wallet);
        tx.setPactId(pactId);
        tx.setAction(action);
        tx.setAmount(amount);
        tx.setTxHash(txHash);
        txRepo.save(tx);
    }

    public List<PactResult> getResults(String pactId) {
        return resultRepo.findByPactIdOrderByTotalVotesDesc(pactId);
    }

    public List<PactParticipant> getParticipants(String pactId) {
        return participantRepo.findByPactIdOrderByJoinedAtAsc(pactId);
    }

    public boolean hasVoted(String pactId, String wallet) {
        return voteRepo.existsByPactIdAndVoterWallet(pactId, wallet);
    }

    @Transactional(readOnly = true)
    public Pact resolveInvite(String code) {
        var link = inviteRepo.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid invite code: " + code));
        Pact pact = link.getPact();
        pact.getId(); // force proxy initialization within open session
        return pact;
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
