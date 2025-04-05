use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenAccount, Mint, TokenInterface, Transfer};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

use crate::{
    state::{UserData, VaultData},
    errors::RedeemError,
    utils::{find_vault_authority_pda, INF_USD_PRICE_FEED_ID, SOL_USD_PRICE_FEED_ID, MAXIMUM_AGE},
};

#[derive(Accounts)]
pub struct Redeem<'info> {
    // The user requesting redemption
    #[account(mut)]
    pub user: Signer<'info>,
    
    // User data account to check principal amount
    #[account(
        mut,
        seeds = [b"user_data", user.key().as_ref()],
        bump,
    )]
    pub user_data: Account<'info, UserData>,
    
    // Vault data account
    #[account(
        mut,
        seeds = [b"vault_data"],
        bump,
    )]
    pub vault_data: Account<'info, VaultData>,
    
    // The token mint of the tokens being redeemed
    pub token_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    
    // The user's token account to receive the redeemed tokens
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    
    // The program's vault token account (source of tokens)
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = vault_authority,
        associated_token::token_program = token_program,
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
    
    // The vault authority (program PDA that "owns" the vault)
    /// CHECK: This is the program's vault authority PDA
    #[account(
        seeds = [b"vault_authority"],
        bump,
    )]
    pub vault_authority: AccountInfo<'info>,
    
    // Pyth price feeds for getting current exchange rate
    /// CHECK: Pyth price update account for INF/USD
    pub price_update_inf: Account<'info, PriceUpdateV2>,
    
    /// CHECK: Pyth price update account for SOL/USD
    pub price_update_sol: Account<'info, PriceUpdateV2>,
}

pub fn redeem(ctx: Context<Redeem>) -> Result<()> {
    // Step 1: Verify the vault_authority is the correct PDA
    msg!("Step 1: Verifying vault authority");
    let (vault_authority, bump) = find_vault_authority_pda();
    require_keys_eq!(ctx.accounts.vault_authority.key(), vault_authority);
    
    // Step 2: Check if user has any principal to redeem
    msg!("Step 2: Checking user principal");
    let user_data = &mut ctx.accounts.user_data;
    require!(
        user_data.total_sol_deposited > 0,
        RedeemError::NoPrincipal
    );
    
    // Step 3: Calculate user's initial exchange rate from stored values
    msg!("Step 3: Calculating initial exchange rate");
    let scale_factor = 1_000_000; // 10^6 scaling for precision
    let initial_exchange_rate = user_data.total_inf_equivalent
        .checked_mul(scale_factor)
        .and_then(|x| x.checked_div(user_data.total_sol_deposited))
        .unwrap_or(0);
    
    msg!("Initial exchange rate (scaled by 10^6): {}", initial_exchange_rate);
    
    // Step 4: Get current INF/USD price from Pyth
    msg!("Step 4: Getting INF/USD price");
    let inf_price_update = &ctx.accounts.price_update_inf;
    let inf_price_data = inf_price_update.get_price_no_older_than(
        &Clock::get()?,
        MAXIMUM_AGE,
        &get_feed_id_from_hex(INF_USD_PRICE_FEED_ID)?,
    )?;

    // Step 5: Get current SOL/USD price from Pyth
    msg!("Step 5: Getting SOL/USD price");
    let sol_price_update = &ctx.accounts.price_update_sol;
    let sol_price_data = sol_price_update.get_price_no_older_than(
        &Clock::get()?,
        MAXIMUM_AGE,
        &get_feed_id_from_hex(SOL_USD_PRICE_FEED_ID)?,
    )?;

    msg!("INF/USD price data: {:?}", inf_price_data);
    msg!("SOL/USD price data: {:?}", sol_price_data);
    
    // Step 6: Calculate current INF/SOL price ratio
    msg!("Step 6: Calculating current INF/SOL price ratio");
    let inf_price_raw = inf_price_data.price as u64;
    let sol_price_raw = sol_price_data.price as u64;
    
    let current_exchange_rate = inf_price_raw
        .checked_mul(scale_factor)
        .and_then(|x| x.checked_div(sol_price_raw))
        .ok_or(RedeemError::InvalidPriceData)?;

    msg!("Current exchange rate (scaled by 10^6): {}", current_exchange_rate);
    
    // Step 7: Ensure current exchange rate isn't lower than initial (solvency check)
    require!(
        current_exchange_rate >= initial_exchange_rate,
        RedeemError::ExchangeRateDecrease
    );
    
    // Step 8: Calculate INF amount to redeem with price appreciation
    msg!("Step 8: Calculating INF to redeem with appreciation");
    let base_inf_amount = user_data.total_inf_equivalent;
    let sol_principal = user_data.total_sol_deposited;

    // Calculate the price ratio between current and initial rates
    let price_ratio = current_exchange_rate
        .checked_mul(scale_factor)
        .and_then(|x| x.checked_div(initial_exchange_rate))
        .ok_or(RedeemError::InvalidPriceData)?;

    // Calculate INF amount with appreciation
    let inf_to_redeem = base_inf_amount
        .checked_mul(price_ratio)
        .and_then(|x| x.checked_div(scale_factor))
        .ok_or(RedeemError::InvalidPriceData)?;

    msg!("Base INF amount: {}", base_inf_amount);
    msg!("Price ratio (scaled by 10^6): {}", price_ratio);
    msg!("INF to redeem with appreciation: {}", inf_to_redeem);
    
    // Step 9: Verify the vault has enough tokens
    msg!("Step 9: Verifying vault balance");
    require!(
        ctx.accounts.vault_token_account.amount >= inf_to_redeem,
        RedeemError::InsufficientVaultBalance
    );
    
    // Step 10: Update user data to reflect the redemption (zero out values)
    msg!("Step 10: Updating user principal");
    user_data.total_sol_deposited = 0;
    user_data.total_inf_equivalent = 0;
    
    // Step 11: Update vault data
    msg!("Step 11: Updating vault data");
    let vault_data = &mut ctx.accounts.vault_data;
    vault_data.total_principal_sol = vault_data.total_principal_sol
        .checked_sub(sol_principal)
        .unwrap();
    
    // Step 12: Transfer INF tokens from vault to user
    msg!("Step 12: Transferring {} INF tokens to user", inf_to_redeem);
    let vault_authority_seeds = &[b"vault_authority".as_ref(), &[bump]];
    let signer_seeds = &[&vault_authority_seeds[..]];
    
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.vault_authority.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    
    anchor_spl::token_interface::transfer(cpi_ctx, inf_to_redeem)?;
    
    // Calculate price change percentage
    let price_change_percent = if initial_exchange_rate > 0 {
        current_exchange_rate
            .checked_sub(initial_exchange_rate)
            .and_then(|change| change.checked_mul(100))
            .and_then(|scaled_change| scaled_change.checked_div(initial_exchange_rate))
            .unwrap_or(0)
    } else {
        0
    };
    
    // Log successful redemption
    msg!("Successfully redeemed principal with appreciation");
    msg!("SOL principal redeemed: {}", sol_principal);
    msg!("Base INF amount: {}", base_inf_amount);
    msg!("INF tokens received (with appreciation): {}", inf_to_redeem);
    msg!("Initial exchange rate: {}", initial_exchange_rate);
    msg!("Current exchange rate: {}", current_exchange_rate);
    msg!("Price change: {}%", price_change_percent);
    
    Ok(())
} 