use anchor_lang::prelude::*;
use crate::{
    state::{Round, RoundState, VaultData},
    errors::RoundError,
    utils::check_authorized_admin,
};

#[derive(Accounts)]
#[instruction(round_number: u64)]
pub struct StartRound<'info> {
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
    
    pub system_program: Program<'info, System>,
}

pub fn start_round(ctx: Context<StartRound>, round_number: u64) -> Result<()> {
    // Check that the authority is the authorized admin
    check_authorized_admin(&ctx.accounts.authority.key())?;
    
    let round = &mut ctx.accounts.round;
    let vault_data = &mut ctx.accounts.vault_data;
    require!(
        round.state == RoundState::Initialized,
        RoundError::InvalidRoundState
    );
    round.state = RoundState::Started;
    vault_data.current_round = round_number;
    round.start_time = Clock::get()?.unix_timestamp;

    msg!("Round started: {}", round_number);
    Ok(())
} 