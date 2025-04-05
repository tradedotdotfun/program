use anchor_lang::prelude::*;
use crate::{
    state::{Round, RoundState, VaultData},
    errors::RoundError,
};

#[derive(Accounts)]
#[instruction(round_number: u64)]
pub struct CloseRound<'info> {
    #[account(
        mut,
        seeds = [b"round", round_number.to_le_bytes().as_ref()],
        bump,
    )]
    pub round: Account<'info, Round>,
    
    #[account(
        mut,
        seeds = [b"vault_data"],
        bump,
    )]
    pub vault_data: Account<'info, VaultData>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn close_round(ctx: Context<CloseRound>, round_number: u64) -> Result<()> {
    let round = &mut ctx.accounts.round;
    require!(round.state == RoundState::Started, RoundError::InvalidRoundState);
    round.state = RoundState::Closed;
    round.end_time = Clock::get()?.unix_timestamp;
    
    msg!("Round ended: {}", round_number);
    msg!("Total SOL deposited: {}", round.total_sol_deposited);
    msg!("Total INF received: {}", round.total_inf_received);
    Ok(())
} 