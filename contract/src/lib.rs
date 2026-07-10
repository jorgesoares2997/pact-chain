#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Map,
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq, Eq)]
pub enum ResolutionMode {
    Majority,
    Judge,
    Unanimity,
}

#[contracttype]
#[derive(Clone, PartialEq, Eq)]
pub enum PactStatus {
    Open,      // accepting joins & votes (until deadline)
    Resolved,  // winner determined — winners can claim their reward
    Refunded,  // no consensus — everyone refunded
}

#[contracttype]
#[derive(Clone)]
pub struct PactState {
    pub creator: Address,
    pub stake_amount: i128,
    pub max_participants: u32,
    pub deadline: u64,
    pub resolution_mode: ResolutionMode,
    pub judge: Option<Address>,
    pub usdc_token: Address,
    pub treasury: Address,
    pub status: PactStatus,
    pub total_staked: i128,
    pub winning_option: Option<u32>,
    pub options_count: u32,
}

#[contracttype]
pub enum DataKey {
    Pact,
    Participants,  // Map<Address, i128>  address → stake
    Votes,         // Map<Address, u32>   voter → option_index
    VoteCount,     // Map<u32, u32>       option_index → vote_count
    Claimed,       // Map<Address, bool>  address → has_claimed
}

const FEE_BPS: i128 = 200; // 2%

// ─────────────────────────────────────────────────────────────────────────────
// Contract
// ─────────────────────────────────────────────────────────────────────────────

#[contract]
pub struct PactChainContract;

#[contractimpl]
impl PactChainContract {
    /// Initialize a new pact. Creator is auto-joined (stakes immediately).
    pub fn initialize(
        env: Env,
        creator: Address,
        stake_amount: i128,
        max_participants: u32,
        deadline: u64,
        resolution_mode: ResolutionMode,
        judge: Option<Address>,
        options_count: u32,
        usdc_token: Address,
        treasury: Address,
    ) {
        creator.require_auth();

        if env.storage().instance().has(&DataKey::Pact) {
            panic!("already initialized");
        }

        assert!(stake_amount > 0, "stake must be positive");
        assert!(max_participants >= 2, "need at least 2 participants");
        assert!(deadline > env.ledger().timestamp(), "deadline must be future");
        assert!(options_count >= 2 && options_count <= 8, "2-8 options");

        if resolution_mode == ResolutionMode::Judge {
            assert!(judge.is_some(), "judge required");
        }

        let state = PactState {
            creator: creator.clone(),
            stake_amount,
            max_participants,
            deadline,
            resolution_mode,
            judge,
            usdc_token: usdc_token.clone(),
            treasury,
            status: PactStatus::Open,
            total_staked: 0,
            winning_option: None,
            options_count,
        };

        env.storage().instance().set(&DataKey::Pact, &state);
        env.storage().instance().set(&DataKey::Participants, &Map::<Address, i128>::new(&env));
        env.storage().instance().set(&DataKey::Votes, &Map::<Address, u32>::new(&env));
        env.storage().instance().set(&DataKey::VoteCount, &Map::<u32, u32>::new(&env));
        env.storage().instance().set(&DataKey::Claimed, &Map::<Address, bool>::new(&env));

        Self::_join_internal(&env, creator, stake_amount, &usdc_token);
    }

    /// Join the pact by staking USDC. Open to anyone until deadline or max_participants.
    pub fn join(env: Env, participant: Address) {
        participant.require_auth();

        let state: PactState = env.storage().instance().get(&DataKey::Pact).unwrap();
        assert!(state.status == PactStatus::Open, "pact not open");
        assert!(env.ledger().timestamp() < state.deadline, "deadline passed");

        let participants: Map<Address, i128> = env.storage().instance().get(&DataKey::Participants).unwrap();
        assert!(!participants.contains_key(participant.clone()), "already joined");
        assert!((participants.len() as u32) < state.max_participants, "pact full");

        let usdc = state.usdc_token.clone();
        let stake = state.stake_amount;
        Self::_join_internal(&env, participant, stake, &usdc);
    }

    /// Cast a vote for an option index (0 = first option, 1 = second, …).
    /// Voting is open to participants during the Open phase until the deadline.
    pub fn vote(env: Env, voter: Address, option_index: u32) {
        voter.require_auth();

        let state: PactState = env.storage().instance().get(&DataKey::Pact).unwrap();
        assert!(state.status == PactStatus::Open, "pact not open");
        assert!(env.ledger().timestamp() <= state.deadline, "deadline passed");
        assert!(option_index < state.options_count, "invalid option");
        assert!(state.resolution_mode != ResolutionMode::Judge, "use judge_resolve");

        let participants: Map<Address, i128> = env.storage().instance().get(&DataKey::Participants).unwrap();
        assert!(participants.contains_key(voter.clone()), "not a participant");

        let mut votes: Map<Address, u32> = env.storage().instance().get(&DataKey::Votes).unwrap();
        assert!(!votes.contains_key(voter.clone()), "already voted");

        let mut vote_count: Map<u32, u32> = env.storage().instance().get(&DataKey::VoteCount).unwrap();
        let current = vote_count.get(option_index).unwrap_or(0);
        vote_count.set(option_index, current + 1);
        votes.set(voter, option_index);

        env.storage().instance().set(&DataKey::Votes, &votes);
        env.storage().instance().set(&DataKey::VoteCount, &vote_count);
    }

    /// Judge resolution: judge picks the winning option and immediately pays out.
    /// (Push model — in judge mode participants don't vote, so pull/claim is not applicable.)
    /// winning_option 0 → creator's side wins; option 1 → all other participants win.
    pub fn judge_resolve(env: Env, judge: Address, winning_option: u32) {
        judge.require_auth();

        let mut state: PactState = env.storage().instance().get(&DataKey::Pact).unwrap();
        assert!(state.status == PactStatus::Open, "pact not open");
        assert!(state.resolution_mode == ResolutionMode::Judge, "not judge mode");
        assert!(state.judge == Some(judge), "not the judge");
        assert!(winning_option < state.options_count, "invalid option");

        state.winning_option = Some(winning_option);
        state.status = PactStatus::Resolved;
        env.storage().instance().set(&DataKey::Pact, &state);

        // Push payout immediately: in judge mode, winning_option 0 = creator wins the pot,
        // winning_option 1 = all non-creator participants split the pot.
        Self::_judge_payout(&env, winning_option);
    }

    /// Trigger resolution after deadline. Anyone can call.
    /// For MAJORITY: resolves if one option has >50% of votes.
    /// For UNANIMITY: resolves if all votes are for the same option.
    /// If no winner is determinable, refunds everyone.
    /// Winners must call claim() after this to receive their reward.
    pub fn resolve(env: Env) {
        let state: PactState = env.storage().instance().get(&DataKey::Pact).unwrap();
        assert!(state.status == PactStatus::Open, "pact not open");
        assert!(env.ledger().timestamp() > state.deadline, "deadline not reached");
        assert!(state.resolution_mode != ResolutionMode::Judge, "use judge_resolve");

        let resolved = Self::_try_resolve(&env);
        if !resolved {
            Self::_refund_all(&env);
        }
    }

    /// Winner calls this to claim their share of the reward pool.
    /// Only participants who voted for the winning option can claim.
    /// Each winner receives (total_staked * 0.98) / winner_count USDC.
    pub fn claim(env: Env, claimant: Address) {
        claimant.require_auth();

        let state: PactState = env.storage().instance().get(&DataKey::Pact).unwrap();
        assert!(state.status == PactStatus::Resolved, "pact not resolved");

        let winning_option = state.winning_option.unwrap();
        let votes: Map<Address, u32> = env.storage().instance().get(&DataKey::Votes).unwrap();

        // Verify claimant voted for the winning option
        let claimant_vote = votes.get(claimant.clone());
        assert!(claimant_vote == Some(winning_option), "not a winner");

        // Verify not already claimed
        let mut claimed: Map<Address, bool> = env.storage().instance().get(&DataKey::Claimed).unwrap();
        assert!(!claimed.get(claimant.clone()).unwrap_or(false), "already claimed");

        // Count winners
        let mut winner_count: i128 = 0;
        for (_voter, opt) in votes.iter() {
            if opt == winning_option {
                winner_count += 1;
            }
        }

        let total = state.total_staked;
        let fee = total * FEE_BPS / 10_000;
        let payout_pool = total - fee;
        let per_winner = payout_pool / winner_count;
        // Treasury fee is split proportionally across all winners
        let fee_share = fee / winner_count;

        claimed.set(claimant.clone(), true);
        env.storage().instance().set(&DataKey::Claimed, &claimed);

        let token_client = token::Client::new(&env, &state.usdc_token);
        let contract_addr = env.current_contract_address();

        token_client.transfer(&contract_addr, &state.treasury, &fee_share);
        token_client.transfer(&contract_addr, &claimant, &per_winner);
    }

    /// Emergency refund after deadline if pact is still Open.
    pub fn refund(env: Env) {
        let state: PactState = env.storage().instance().get(&DataKey::Pact).unwrap();
        assert!(state.status == PactStatus::Open, "pact not open");
        assert!(env.ledger().timestamp() > state.deadline, "deadline not reached");

        Self::_refund_all(&env);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    pub fn get_pact(env: Env) -> PactState {
        env.storage().instance().get(&DataKey::Pact).unwrap()
    }

    pub fn get_participants(env: Env) -> Map<Address, i128> {
        env.storage().instance().get(&DataKey::Participants).unwrap()
    }

    pub fn get_votes(env: Env) -> Map<Address, u32> {
        env.storage().instance().get(&DataKey::Votes).unwrap()
    }

    pub fn get_vote_count(env: Env) -> Map<u32, u32> {
        env.storage().instance().get(&DataKey::VoteCount).unwrap()
    }

    pub fn get_claimed(env: Env) -> Map<Address, bool> {
        env.storage().instance().get(&DataKey::Claimed).unwrap()
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    fn _join_internal(env: &Env, participant: Address, stake_amount: i128, usdc_token: &Address) {
        let token_client = token::Client::new(env, usdc_token);
        token_client.transfer(&participant, &env.current_contract_address(), &stake_amount);

        let mut participants: Map<Address, i128> = env.storage().instance().get(&DataKey::Participants).unwrap();
        participants.set(participant, stake_amount);

        let mut state: PactState = env.storage().instance().get(&DataKey::Pact).unwrap();
        state.total_staked += stake_amount;

        env.storage().instance().set(&DataKey::Participants, &participants);
        env.storage().instance().set(&DataKey::Pact, &state);
    }

    /// Tallies votes and marks pact Resolved if a winner is found. No USDC transferred here.
    fn _try_resolve(env: &Env) -> bool {
        let mut state: PactState = env.storage().instance().get(&DataKey::Pact).unwrap();
        let vote_count: Map<u32, u32> = env.storage().instance().get(&DataKey::VoteCount).unwrap();
        let participants: Map<Address, i128> = env.storage().instance().get(&DataKey::Participants).unwrap();
        let votes: Map<Address, u32> = env.storage().instance().get(&DataKey::Votes).unwrap();

        let participant_count = participants.len() as u32;
        let votes_cast = votes.len() as u32;

        match state.resolution_mode {
            ResolutionMode::Majority => {
                let threshold = participant_count / 2 + 1;
                let mut best_option: Option<u32> = None;
                let mut best_count: u32 = 0;

                for i in 0..state.options_count {
                    let count = vote_count.get(i).unwrap_or(0);
                    if count > best_count {
                        best_count = count;
                        best_option = Some(i);
                    }
                }

                if let Some(opt) = best_option {
                    if best_count >= threshold {
                        state.winning_option = Some(opt);
                        state.status = PactStatus::Resolved;
                        env.storage().instance().set(&DataKey::Pact, &state);
                        return true;
                    }
                }
                false
            }

            ResolutionMode::Unanimity => {
                if votes_cast == participant_count && participant_count > 0 {
                    let mut unanimity_option: Option<u32> = None;
                    let mut unanimous = true;

                    for (_voter, opt) in votes.iter() {
                        match unanimity_option {
                            None => unanimity_option = Some(opt),
                            Some(first) => {
                                if first != opt {
                                    unanimous = false;
                                    break;
                                }
                            }
                        }
                    }

                    if unanimous {
                        if let Some(opt) = unanimity_option {
                            state.winning_option = Some(opt);
                            state.status = PactStatus::Resolved;
                            env.storage().instance().set(&DataKey::Pact, &state);
                            return true;
                        }
                    }
                }
                false
            }

            ResolutionMode::Judge => false,
        }
    }

    /// Judge mode payout: option 0 = creator takes the whole pot; option 1 = all others split it.
    fn _judge_payout(env: &Env, winning_option: u32) {
        let state: PactState = env.storage().instance().get(&DataKey::Pact).unwrap();
        let participants: Map<Address, i128> = env.storage().instance().get(&DataKey::Participants).unwrap();

        let total = state.total_staked;
        let fee = total * FEE_BPS / 10_000;
        let payout_pool = total - fee;

        let token_client = token::Client::new(env, &state.usdc_token);
        let contract_addr = env.current_contract_address();

        token_client.transfer(&contract_addr, &state.treasury, &fee);

        if winning_option == 0 {
            // Creator wins the whole pot
            token_client.transfer(&contract_addr, &state.creator, &payout_pool);
        } else {
            // All non-creator participants split the pot
            let mut non_creator_count: i128 = 0;
            for (addr, _) in participants.iter() {
                if addr != state.creator {
                    non_creator_count += 1;
                }
            }
            if non_creator_count == 0 {
                // Edge case: only creator joined — refund them
                token_client.transfer(&contract_addr, &state.creator, &payout_pool);
            } else {
                let per_winner = payout_pool / non_creator_count;
                for (addr, _) in participants.iter() {
                    if addr != state.creator {
                        token_client.transfer(&contract_addr, &addr, &per_winner);
                    }
                }
            }
        }
    }

    fn _refund_all(env: &Env) {
        let mut state: PactState = env.storage().instance().get(&DataKey::Pact).unwrap();
        let participants: Map<Address, i128> = env.storage().instance().get(&DataKey::Participants).unwrap();

        let token_client = token::Client::new(env, &state.usdc_token);
        let contract_addr = env.current_contract_address();

        for (addr, amount) in participants.iter() {
            token_client.transfer(&contract_addr, &addr, &amount);
        }

        state.status = PactStatus::Refunded;
        env.storage().instance().set(&DataKey::Pact, &state);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token::{Client as TokenClient, StellarAssetClient},
        Env,
    };

    fn setup() -> (Env, Address, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let treasury = Address::generate(&env);

        let usdc_id = env.register_stellar_asset_contract_v2(admin.clone());
        let usdc = usdc_id.address();

        let asset_admin = StellarAssetClient::new(&env, &usdc);
        asset_admin.mint(&creator, &10_000_0000000i128);
        asset_admin.mint(&alice, &10_000_0000000i128);
        asset_admin.mint(&bob, &10_000_0000000i128);

        (env, creator, alice, bob, treasury, usdc)
    }

    fn deploy(env: &Env, creator: &Address, treasury: &Address, usdc: &Address, mode: ResolutionMode, judge: Option<Address>) -> Address {
        let id = env.register_contract(None, PactChainContract);
        let client = PactChainContractClient::new(env, &id);
        let now = env.ledger().timestamp();
        client.initialize(creator, &100_0000000i128, &5u32, &(now + 3600), &mode, &judge, &2u32, usdc, treasury);
        id
    }

    #[test]
    fn test_majority_winners_claim() {
        let (env, creator, alice, bob, treasury, usdc) = setup();
        let contract_id = deploy(&env, &creator, &treasury, &usdc, ResolutionMode::Majority, None);
        let client = PactChainContractClient::new(&env, &contract_id);
        let token = TokenClient::new(&env, &usdc);

        client.join(&alice);
        client.join(&bob);

        // creator=Yes(0), alice=Yes(0), bob=No(1)
        client.vote(&creator, &0u32);
        client.vote(&alice, &0u32);
        client.vote(&bob, &1u32);

        // advance past deadline and resolve
        env.ledger().with_mut(|l| l.timestamp += 7200);
        client.resolve();

        let state = client.get_pact();
        assert!(state.status == PactStatus::Resolved);
        assert!(state.winning_option == Some(0u32));

        // winners claim individually
        let alice_before = token.balance(&alice);
        client.claim(&alice);

        let total = 3 * 100_0000000i128;
        let fee = total * 200 / 10_000;
        let pool = total - fee;
        let per_winner = pool / 2;
        assert_eq!(token.balance(&alice), alice_before + per_winner);

        // loser and double-claim are verified by the assert guards in claim()
        // (would panic with "not a winner" / "already claimed")
    }

    #[test]
    fn test_unanimity_refund_on_no_consensus() {
        let (env, creator, alice, _bob, treasury, usdc) = setup();
        let contract_id = deploy(&env, &creator, &treasury, &usdc, ResolutionMode::Unanimity, None);
        let client = PactChainContractClient::new(&env, &contract_id);
        let token = TokenClient::new(&env, &usdc);

        client.join(&alice);

        let alice_before = token.balance(&alice);
        let creator_before = token.balance(&creator);

        // creator=Yes, alice=No → no unanimity → refund
        client.vote(&creator, &0u32);
        client.vote(&alice, &1u32);

        env.ledger().with_mut(|l| l.timestamp += 7200);
        client.resolve();

        let state = client.get_pact();
        assert!(state.status == PactStatus::Refunded);
        assert_eq!(token.balance(&alice), alice_before + 100_0000000i128);
        assert_eq!(token.balance(&creator), creator_before + 100_0000000i128);
    }

    #[test]
    fn test_judge_resolve_and_claim() {
        let (env, creator, alice, _bob, treasury, usdc) = setup();
        let judge = Address::generate(&env);
        let contract_id = deploy(&env, &creator, &treasury, &usdc, ResolutionMode::Judge, Some(judge.clone()));
        let client = PactChainContractClient::new(&env, &contract_id);
        let token = TokenClient::new(&env, &usdc);

        client.join(&alice);

        let creator_before = token.balance(&creator);
        let treasury_before = token.balance(&treasury);

        // Judge picks option 0 → creator wins, payout is immediate (push)
        client.judge_resolve(&judge, &0u32);

        let state = client.get_pact();
        assert!(state.status == PactStatus::Resolved);
        assert!(state.winning_option == Some(0u32));

        let total = 2 * 100_0000000i128;
        let fee = total * 200 / 10_000;
        let pool = total - fee;
        assert_eq!(token.balance(&creator), creator_before + pool);
        assert_eq!(token.balance(&treasury), treasury_before + fee);
    }
}
