use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, 
    token_interface::{Mint, TokenAccount, TokenInterface, Transfer}
};

use crate::{
    state::{Round, RoundState},
    errors::RoundError,
    utils::reward_token_mint,
};

#[derive(Accounts)]
#[instruction(round_number: u64)]
pub struct ParticipateRound<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"round", round_number.to_le_bytes().as_ref()],
        bump,
    )]
    pub round: Account<'info, Round>,

    #[account(
        mut,
        address = reward_token_mint()
    )]
    pub reward_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = user,
        associated_token::token_program = reward_mint_program,
    )]
    pub user_reward_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = reward_mint,
        associated_token::authority = round,
        associated_token::token_program = reward_mint_program,
    )]
    pub round_reward_token_account: InterfaceAccount<'info, TokenAccount>,

    pub reward_mint_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn participate_round(ctx: Context<ParticipateRound>, round_number: u64) -> Result<()> {
    // Verify round is active
    require!(
        ctx.accounts.round.state == RoundState::Started,
        RoundError::InvalidRoundState
    );

    // Verify round number matches
    require!(
        ctx.accounts.round.round_number == round_number,
        RoundError::InvalidRoundNumber
    );

    // Transfer 1 reward token from user to round
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_reward_token_account.to_account_info(),
        to: ctx.accounts.round_reward_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    let cpi_program = ctx.accounts.reward_mint_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    // Transfer exactly 1 reward token
    anchor_spl::token_interface::transfer(cpi_ctx, 1)?;    
    // Update total chips
    ctx.accounts.round.total_chips = ctx.accounts.round.total_chips
        .checked_add(1)
        .unwrap();
    

    Ok(())
} 