#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Map, Vec,
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
    Resolved,  // winner(s) paid out
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
    pub options_count: u32,    // number of vote options (2 = Yes/No)
}

#[contracttype]
pub enum DataKey {
    Pact,
    Participants,    // Map<Address, i128>  address → stake
    Votes,           // Map<Address, u32>   voter → option_index
    VoteCount,       // Map<u32, u32>       option_index → vote_count
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

        // Auto-join creator
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

    /// Judge resolution: judge picks the winning option index directly.
    /// Can be called any time while pact is Open (no deadline constraint for judge).
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

        Self::_payout_winners(&env, winning_option);
    }

    /// Trigger resolution after deadline. Anyone can call.
    /// For MAJORITY: pays the option with most votes (if it has >50%).
    /// For UNANIMITY: pays if all votes are for the same option.
    /// If no winner is determinable, refunds everyone.
    pub fn resolve(env: Env) {
        let state: PactState = env.storage().instance().get(&DataKey::Pact).unwrap();
        assert!(state.status == PactStatus::Open, "pact not open");
        assert!(env.ledger().timestamp() > state.deadline, "deadline not reached");
        assert!(state.resolution_mode != ResolutionMode::Judge, "use judge_resolve");

        let resolved = Self::_try_resolve(&env);
        if !resolved {
            // No winner — refund everyone
            Self::_refund_all(&env);
        }
    }

    /// Emergency refund (callable only after deadline if pact is still Open).
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

    /// Returns true if resolution happened, false if no winner yet.
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
                        Self::_payout_winners(env, opt);
                        return true;
                    }
                }
                false
            }

            ResolutionMode::Unanimity => {
                if votes_cast == participant_count && participant_count > 0 {
                    // Check if all votes are for the same option
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
                            Self::_payout_winners(env, opt);
                            return true;
                        }
                    }
                }
                false
            }

            ResolutionMode::Judge => false,
        }
    }

    /// Pay out participants who voted for the winning option.
    /// Winners split the total pot (minus fee). If nobody voted for the winning
    /// option (judge mode edge case), refund everyone.
    fn _payout_winners(env: &Env, winning_option: u32) {
        let state: PactState = env.storage().instance().get(&DataKey::Pact).unwrap();
        let votes: Map<Address, u32> = env.storage().instance().get(&DataKey::Votes).unwrap();
        let participants: Map<Address, i128> = env.storage().instance().get(&DataKey::Participants).unwrap();

        // Collect winners — everyone who voted for winning_option
        // In judge mode (no votes cast) winners = all participants
        let mut winners: Vec<Address> = Vec::new(env);

        if votes.is_empty() {
            // No votes cast — judge picked an outcome but nobody voted
            // Just refund everyone
            Self::_refund_all(env);
            return;
        }

        for (voter, opt) in votes.iter() {
            if opt == winning_option {
                winners.push_back(voter);
            }
        }

        if winners.is_empty() {
            // Nobody voted for the winning option — refund everyone
            Self::_refund_all(env);
            return;
        }

        let total = state.total_staked;
        let fee = total * FEE_BPS / 10_000;
        let payout_pool = total - fee;
        let winner_count = winners.len() as i128;
        let per_winner = payout_pool / winner_count;

        let token_client = token::Client::new(env, &state.usdc_token);
        let contract_addr = env.current_contract_address();

        // Pay fee
        token_client.transfer(&contract_addr, &state.treasury, &fee);

        // Pay each winner
        for winner in winners.iter() {
            token_client.transfer(&contract_addr, &winner, &per_winner);
        }

        // Refund participants who didn't vote (they abstained — return their stake)
        for (participant, stake) in participants.iter() {
            if !votes.contains_key(participant.clone()) {
                token_client.transfer(&contract_addr, &participant, &stake);
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
    fn test_majority_yes_wins() {
        let (env, creator, alice, bob, treasury, usdc) = setup();
        let contract_id = deploy(&env, &creator, &treasury, &usdc, ResolutionMode::Majority, None);
        let client = PactChainContractClient::new(&env, &contract_id);
        let token = TokenClient::new(&env, &usdc);

        // creator auto-joined; alice and bob join
        client.join(&alice);
        client.join(&bob);

        let alice_before = token.balance(&alice);

        // creator=Yes(0), alice=Yes(0), bob=No(1) → Yes wins 2/3 → majority (need >50%)
        client.vote(&creator, &0u32);
        client.vote(&alice, &0u32);
        // majority reached (2 of 3 > 50%), resolves immediately

        let state = client.get_pact();
        assert!(state.status == PactStatus::Resolved);
        assert!(state.winning_option == Some(0u32));

        // alice and creator voted Yes → split the pot minus fee
        // bob voted No → loser
        let total = 3 * 100_0000000i128;
        let fee = total * 200 / 10_000;
        let pool = total - fee;
        let per_winner = pool / 2; // creator + alice
        assert_eq!(token.balance(&alice), alice_before + per_winner);
    }

    #[test]
    fn test_unanimity_refund_on_no_consensus() {
        let (env, creator, alice, bob, treasury, usdc) = setup();
        let contract_id = deploy(&env, &creator, &treasury, &usdc, ResolutionMode::Unanimity, None);
        let client = PactChainContractClient::new(&env, &contract_id);
        let token = TokenClient::new(&env, &usdc);

        client.join(&alice);

        let alice_before = token.balance(&alice);
        let creator_before = token.balance(&creator);

        // creator=Yes, alice=No → no unanimity → refund
        client.vote(&creator, &0u32);
        client.vote(&alice, &1u32);

        // All votes cast, not unanimous
        env.ledger().with_mut(|l| l.timestamp += 7200);
        client.resolve();

        let state = client.get_pact();
        assert!(state.status == PactStatus::Refunded);
        assert_eq!(token.balance(&alice), alice_before + 100_0000000i128);
        assert_eq!(token.balance(&creator), creator_before + 100_0000000i128);
    }

    #[test]
    fn test_judge_resolves_yes() {
        let (env, creator, alice, bob, treasury, usdc) = setup();
        let judge = Address::generate(&env);
        let contract_id = deploy(&env, &creator, &treasury, &usdc, ResolutionMode::Judge, Some(judge.clone()));
        let client = PactChainContractClient::new(&env, &contract_id);
        let token = TokenClient::new(&env, &usdc);

        client.join(&alice);

        // both vote Yes (informational in judge mode)
        client.vote(&creator, &0u32);
        client.vote(&alice, &0u32);

        let alice_before = token.balance(&alice);
        let treasury_before = token.balance(&treasury);

        // judge picks Yes (option 0) as winner
        client.judge_resolve(&judge, &0u32);

        let state = client.get_pact();
        assert!(state.status == PactStatus::Resolved);
        assert!(state.winning_option == Some(0u32));

        let total = 2 * 100_0000000i128;
        let fee = total * 200 / 10_000;
        assert_eq!(token.balance(&treasury), treasury_before + fee);
    }
}
