use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, 
    associated_token::get_associated_token_address,
    token_interface::{Mint, TokenAccount, TokenInterface, Transfer, Burn}
};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

use crate::{
    state::{Round, RoundState, VaultData},
    errors::RoundError,
    utils::{inf_mint, find_vault_authority_pda, find_round_pda, reward_token_mint, 
            INF_USD_PRICE_FEED_ID, SOL_USD_PRICE_FEED_ID, MAXIMUM_AGE},
};

#[derive(Accounts)]
#[instruction(round_number: u64)]
pub struct DistributeReward<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

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

    #[account(
        mut,
        associated_token::mint = inf_mint,
        associated_token::authority = vault_authority,
        associated_token::token_program = inf_mint_program,
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        address = reward_token_mint()
    )]
    pub reward_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = round,
        associated_token::token_program = reward_mint_program,
    )]
    pub round_reward_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: This is the program's vault authority PDA
    #[account(
        seeds = [b"vault_authority"],
        bump,
    )]
    pub vault_authority: AccountInfo<'info>,

    pub inf_mint: InterfaceAccount<'info, Mint>,
    pub inf_mint_program: Interface<'info, TokenInterface>,
    pub reward_mint_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// CHECK: Pyth price update account for INF/USD
    pub price_update_inf: Account<'info, PriceUpdateV2>,
    /// CHECK: Pyth price update account for SOL/USD
    pub price_update_sol: Account<'info, PriceUpdateV2>,
}

pub fn distribute_reward<'info>(
    ctx: Context<'_, '_, '_, 'info, DistributeReward<'info>>, 
    round_number: u64,
    winner_addresses: Vec<Pubkey>,
    winner_ratios: Vec<u64>,
) -> Result<()> {
    // Verify round is active
    require!(
        ctx.accounts.round.state == RoundState::Closed,
        RoundError::InvalidRoundState
    );

    // Verify round number matches
    require!(
        ctx.accounts.round.round_number == round_number,
        RoundError::InvalidRoundNumber
    );

    
    // Step 1: Verify arrays have same length and total ratio is 100%
    msg!("Step 1: Verifying winner data");
    require!(
        winner_addresses.len() == winner_ratios.len(),
        RoundError::InvalidWinnerData
    );

    // Step 2: Get current INF/USD price from Pyth
    msg!("Step 2: Getting INF/USD price");
    let inf_price_update = &ctx.accounts.price_update_inf;
    let inf_price_data = inf_price_update.get_price_no_older_than(
        &Clock::get()?,
        MAXIMUM_AGE,
        &get_feed_id_from_hex(INF_USD_PRICE_FEED_ID)?,
    )?;

    // Step 3: Get current SOL/USD price from Pyth
    msg!("Step 3: Getting SOL/USD price");
    let sol_price_update = &ctx.accounts.price_update_sol;
    let sol_price_data = sol_price_update.get_price_no_older_than(
        &Clock::get()?,
        MAXIMUM_AGE,
        &get_feed_id_from_hex(SOL_USD_PRICE_FEED_ID)?,
    )?;

    msg!("INF/USD price data: {:?}", inf_price_data);
    msg!("SOL/USD price data: {:?}", sol_price_data);
    
    // Step 4: Calculate INF/SOL price ratio
    msg!("Step 4: Calculating INF/SOL price ratio");
    let inf_price_raw = inf_price_data.price as u64;
    let sol_price_raw = sol_price_data.price as u64;
    
    let scale_factor = 1_000_000; // 10^6 scaling for precision
    let current_inf_sol_price = inf_price_raw
        .checked_mul(scale_factor)
        .and_then(|x| x.checked_div(sol_price_raw))
        .ok_or(RoundError::InvalidPriceData)?;

    msg!("Calculated INF/SOL price (scaled by 10^6): {}", current_inf_sol_price);

    // Step 5: Calculate initial INF price from round data
    msg!("Step 5: Calculating initial INF price");
    let initial_inf_price = ctx.accounts.round.total_inf_received
        .checked_mul(scale_factor)
        .and_then(|x| x.checked_div(ctx.accounts.round.total_sol_deposited))
        .ok_or(RoundError::InvalidPriceData)?;

    // Step 6: Calculate price increase percentage
    msg!("Step 6: Calculating price increase percentage");
    let price_increase = current_inf_sol_price
        .checked_sub(initial_inf_price)
        .and_then(|x| x.checked_mul(100))
        .and_then(|x| x.checked_div(initial_inf_price))
        .ok_or(RoundError::InvalidPriceData)?;

    // Step 7: Calculate total INF to distribute (interest only)
    msg!("Step 7: Calculating INF distribution amount");
    let total_inf = ctx.accounts.vault_token_account.amount;
    let principal_inf = total_inf
        .checked_mul(100)
        .and_then(|x| x.checked_div(100 + price_increase))
        .ok_or(RoundError::InvalidPriceData)?;

    let interest_inf = total_inf
        .checked_sub(principal_inf)
        .ok_or(RoundError::InvalidPriceData)?;

    // Step 8: Calculate reward amount per token
    msg!("Step 8: Calculating reward per token");
    let round_participation_tokens = ctx.accounts.round_reward_token_account.amount;
    require!(round_participation_tokens > 0, RoundError::NoRewardsToDistribute);

    let reward_token_supply = ctx.accounts.reward_mint.supply;

    let reward_amount = interest_inf
        .checked_mul(round_participation_tokens)
        .and_then(|x| x.checked_div(reward_token_supply))
        .ok_or(RoundError::InvalidPriceData)?;

    
    msg!("Total INF in vault: {}", total_inf);
    msg!("Total reward amount to distribute: {}", reward_amount);


    // Step 9: Verify total reward ratio is 100%
    msg!("Step 9: Verifying total reward ratio");
    let total_ratio: u64 = winner_ratios.iter().sum();
    require!(
        total_ratio == 100,
        RoundError::InvalidWinnerData
    );
    
    // Step 10: Verify remaining accounts
    msg!("Step 10: Verifying remaining accounts");
    require!(
        ctx.remaining_accounts.len() == winner_addresses.len(),
        RoundError::InvalidRemainingAccounts
    );
    

    // Step 11: Get PDA signer seeds for transfers
    msg!("Step 11: Getting PDA signer seeds");
    let (_, bump) = find_vault_authority_pda();
    let vault_authority_seeds = &[b"vault_authority".as_ref(), &[bump]];
    let signer_seeds = &[&vault_authority_seeds[..]];
        
    // Step 12: Distribute INF to winners
    msg!("Step 12: Distributing INF to winners");
    
    for i in 0..winner_addresses.len() {
        let winner_address = &winner_addresses[i];
        let ratio = winner_ratios[i];
        let winner_token_account = &ctx.remaining_accounts[i];
        
        let winner_share = reward_amount
            .checked_mul(ratio)
            .and_then(|x| x.checked_div(100))
            .ok_or(RoundError::InvalidPriceData)?;

        if winner_share > 0 {
            // Verify this token account belongs to the winner by checking its data
            let expected_token_address = get_associated_token_address(
                winner_address,
                &inf_mint()
            );
            
            require!(
                winner_token_account.key() == expected_token_address,
                RoundError::InvalidTokenAccount
            );
            
            msg!("Winner {} share: {} INF", winner_address, winner_share);
            
            let from_info = ctx.accounts.vault_token_account.to_account_info();
            let authority_info = ctx.accounts.vault_authority.to_account_info();
            
            let cpi_accounts = Transfer {
                from: from_info,
                to: winner_token_account.clone(),
                authority: authority_info,
            };

            let cpi_program = ctx.accounts.inf_mint_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            
            anchor_spl::token_interface::transfer(cpi_ctx, winner_share)?;
        }
    }

    // Step 13: Burning reward tokens
    msg!("Step 13: Burning reward tokens");
    let burn_amount = ctx.accounts.round_reward_token_account.amount;
    if burn_amount > 0 {
        // Get round PDA signer seeds for burn authorization
        let (_, round_bump) = find_round_pda(round_number);
        let round_number_bytes = round_number.to_le_bytes();
        let round_seeds = &[b"round", round_number_bytes.as_ref(), &[round_bump]];
        let round_signer_seeds = &[&round_seeds[..]];
        
        let cpi_accounts = Burn {
            mint: ctx.accounts.reward_mint.to_account_info(),
            from: ctx.accounts.round_reward_token_account.to_account_info(),
            authority: ctx.accounts.round.to_account_info(),
        };

        let cpi_program = ctx.accounts.reward_mint_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(
            cpi_program, 
            cpi_accounts, 
            round_signer_seeds
        );
        
        anchor_spl::token_interface::burn(cpi_ctx, burn_amount)?;
    }

    // Step 14: Update round state and vault data
    msg!("Step 14: Updating round state and vault data");
    ctx.accounts.round.state = RoundState::Closed;
    ctx.accounts.round.end_time = Clock::get()?.unix_timestamp;

    msg!("Rewards distributed for round {}", round_number);
    msg!("Total INF distributed: {}", reward_amount);
    msg!("Total chips burned: {}", burn_amount);
    msg!("Reward per token: {}", reward_amount);
    msg!("SOL distributed for Round {}", round_number);
    Ok(())
}