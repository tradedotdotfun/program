use anchor_lang::prelude::*;
pub mod state;
pub mod errors;
pub mod utils;
pub mod instructions;

pub use instructions::*;
pub use state::*;

declare_id!("B1ph2kyNtkhscRQ3R1CAwMNM4PbGGvphHTzxR83kRsRc");

#[program]
pub mod trade_dot_fun {

    use crate::instructions::deposit_sol::UserSwap;
    use crate::instructions::redeem::Redeem;
    use crate::instructions::initialize_round::InitializeRound;
    use crate::instructions::start_round::StartRound;
    use crate::instructions::close_round::CloseRound;
    use crate::instructions::participate_round::ParticipateRound;
    use crate::instructions::distribute_reward::DistributeReward;
    use crate::instructions::distribute_zbtc_reward::DistributeZbtcReward;
    use crate::instructions::initialize_vault_data::InitializeVaultData;
    use crate::instructions::initialize_user_data::InitializeUserData;

    use super::*;

    pub fn deposit_sol(ctx: Context<UserSwap>, round_number: u64, data: Vec<u8>) -> Result<()> {
        instructions::deposit_sol::deposit_sol(ctx, round_number, data)
    }

    pub fn redeem(ctx: Context<Redeem>) -> Result<()> {
        instructions::redeem::redeem(ctx)
    }

    pub fn initialize_round(ctx: Context<InitializeRound>, round_number: u64) -> Result<()> {
        instructions::initialize_round::initialize_round(ctx, round_number)
    }

    pub fn start_round(ctx: Context<StartRound>, round_number: u64) -> Result<()> {
        instructions::start_round::start_round(ctx, round_number)
    }

    pub fn close_round(ctx: Context<CloseRound>, round_number: u64) -> Result<()> {
        instructions::close_round::close_round(ctx, round_number)
    }

    pub fn participate_round(ctx: Context<ParticipateRound>, round_number: u64) -> Result<()> {
        instructions::participate_round::participate_round(ctx, round_number)
    }

    pub fn distribute_reward<'info>(
        ctx: Context<'_, '_, '_, 'info, DistributeReward<'info>>, 
        round_number: u64,
        winner_addresses: Vec<Pubkey>,
        winner_ratios: Vec<u64>,
    ) -> Result<()> {
        instructions::distribute_reward::distribute_reward(ctx, round_number, winner_addresses, winner_ratios)
    }

    pub fn distribute_zbtc_reward<'info>(
        ctx: Context<'_, '_, '_, 'info, DistributeZbtcReward<'info>>, 
        round_number: u64,
        winner_addresses: Vec<Pubkey>,
        winner_ratios: Vec<u64>,
        jupiter_swap_data: Vec<u8>,
    ) -> Result<()> {
        instructions::distribute_zbtc_reward::distribute_zbtc_reward(
            ctx, 
            round_number, 
            winner_addresses, 
            winner_ratios,
            jupiter_swap_data
        )
    }

    pub fn initialize_vault_data(ctx: Context<InitializeVaultData>) -> Result<()> {
        instructions::initialize_vault_data::initialize_vault_data(ctx)
    }

    pub fn initialize_user_data(ctx: Context<InitializeUserData>) -> Result<()> {
        instructions::initialize_user_data::initialize_user_data(ctx)
    }
}
