use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RoundState {
    Started,
    Closed,
    Initialized,
}

#[account]
pub struct Round {
    pub round_number: u64,
    pub state: RoundState,
    pub total_sol_deposited: u64,
    pub total_inf_received: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub total_reward_tokens_minted: u64,
    pub total_chips: u64,  // Total chips betted in this round
}

#[account]
pub struct UserData {
    pub user: Pubkey,
    pub total_sol_deposited: u64,
    pub total_inf_equivalent: u64,  // Total INF equivalent to the SOL deposited (at deposit time)
}

#[account]
pub struct VaultData {
    pub total_principal_sol: u64,
    pub current_round: u64,
    pub exchange_rate: u64,  // Latest INF/SOL exchange rate (scaled by 10^6)
    pub last_price_update: i64,  // Timestamp of last price update
    pub is_round_active: bool,
}

#[account]
pub struct PythPriceAccount {
    pub price: i64,
    pub conf: u64,
    pub status: u32,
    pub corp_act: u32,
    pub pub_slot: u64,
} 