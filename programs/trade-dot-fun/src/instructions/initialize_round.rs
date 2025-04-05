use anchor_lang::prelude::*;

use crate::{Round, RoundState};


#[derive(Accounts)]
#[instruction(round_number: u64)]
pub struct InitializeRound<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 1 + 8 + 8 + 8 + 8 + 8 + 33, // 8 (discriminator) + 8 (u64) + 1 (enum) + 8 (u64) + 8 (u64) + 8 (i64) + 8 (i64) + 8 (u64) + 33 (Option<Pubkey>)
        seeds = [b"round", round_number.to_le_bytes().as_ref()],
        bump,
    )]
    pub round: Account<'info, Round>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_round(ctx: Context<InitializeRound>, round_number: u64) -> Result<()> {
    let round = &mut ctx.accounts.round;
    
    msg!("Step 1: Initializing round {}", round_number);
    round.round_number = round_number;
    round.state = RoundState::Initialized;
    round.total_sol_deposited = 0;
    round.total_inf_received = 0;
    round.total_reward_tokens_minted = 0;
    round.total_chips = 0;
    msg!("Round {} initialized with PDA: {}", round_number, round.key());
    Ok(())
} 