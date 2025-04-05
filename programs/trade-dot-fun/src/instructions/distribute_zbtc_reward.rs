use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke, program_error::ProgramError},
};
use anchor_spl::{
    associated_token::AssociatedToken, 
    associated_token::get_associated_token_address,
    token_interface::{Mint, TokenAccount, TokenInterface, Transfer, Burn}
};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::{
    state::{Round, RoundState, VaultData},
    errors::RoundError,
    utils::{ zbtc_mint, find_vault_authority_pda, find_round_pda, chip_token_mint, 
             check_authorized_admin,
            jupiter_program_id},
};

#[derive(Accounts)]
#[instruction(round_number: u64)]
pub struct DistributeZbtcReward<'info> {
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

    // INF vault token account - we'll transfer from here to swap
    #[account(
        mut,
        associated_token::mint = inf_mint,
        associated_token::authority = vault_authority,
        associated_token::token_program = inf_mint_program,
    )]
    pub vault_inf_token_account: InterfaceAccount<'info, TokenAccount>,

    // ZBTC vault token account - used for receiving ZBTC from swap
    #[account(
        mut,
        associated_token::mint = zbtc_mint,
        associated_token::authority = vault_authority,
        associated_token::token_program = zbtc_mint_program,
    )]
    pub vault_zbtc_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        address = chip_token_mint()
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
    
    pub zbtc_mint: InterfaceAccount<'info, Mint>,
    pub zbtc_mint_program: Interface<'info, TokenInterface>,
    
    pub reward_mint_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    
    /// CHECK: This is Jupiter program with address verified
    #[account(
        address = jupiter_program_id() @ ProgramError::IncorrectProgramId
    )]
    pub jupiter_program: AccountInfo<'info>,

    /// CHECK: Pyth price update account for INF/USD
    pub price_update_inf: Account<'info, PriceUpdateV2>,
    /// CHECK: Pyth price update account for SOL/USD
    pub price_update_sol: Account<'info, PriceUpdateV2>,
}

pub fn distribute_zbtc_reward<'info>(
    ctx: Context<'_, '_, '_, 'info, DistributeZbtcReward<'info>>, 
    round_number: u64,
    winner_addresses: Vec<Pubkey>,
    winner_ratios: Vec<u64>,
    jupiter_swap_data: Vec<u8>, // Jupiter swap instruction data
) -> Result<()> {
    // Check that the authority is the authorized admin
    check_authorized_admin(&ctx.accounts.authority.key())?;
    
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

    // Step 2: Verify total reward ratio is 100%
    msg!("Step 2: Verifying total reward ratio");
    let total_ratio: u64 = winner_ratios.iter().sum();
    require!(
        total_ratio == 100,
        RoundError::InvalidWinnerData
    );

    // Step 3: Verify INF availability in vault 
    msg!("Step 3: Verifying INF availability in vault");
    let vault_inf_balance_before = ctx.accounts.vault_inf_token_account.amount;
    require!(
        vault_inf_balance_before > 0,
        RoundError::InsufficientFunds
    );
    
    // Step 4: Get ZBTC balance before swap
    msg!("Step 4: Getting ZBTC balance before swap");
    let vault_zbtc_balance_before = ctx.accounts.vault_zbtc_token_account.amount;
    
    // Step 5: Prepare Jupiter swap
    msg!("Step 5: Preparing Jupiter swap");
    let accounts: Vec<AccountMeta> = ctx
        .remaining_accounts
        .iter()
        .map(|acc| {
            AccountMeta {
                pubkey: *acc.key,
                is_signer: acc.key == &ctx.accounts.authority.key() && acc.is_signer,
                is_writable: acc.is_writable,
            }
        })
        .collect();

    // Store the accounts length before moving accounts vector
    let accounts_len = accounts.len();

    let accounts_infos: Vec<AccountInfo> = ctx
        .remaining_accounts
        .iter()
        .map(|acc| AccountInfo { ..acc.clone() })
        .collect();

    // Step 6: Execute Jupiter swap to convert INF to ZBTC
    msg!("Step 6: Executing Jupiter swap from INF to ZBTC");
    invoke(
        &Instruction {
            program_id: ctx.accounts.jupiter_program.key(),
            accounts,
            data: jupiter_swap_data,
        },
        &accounts_infos,
    )?;

    // Step 7: Calculate the amount of ZBTC received
    msg!("Step 7: Calculating ZBTC received from swap");
    let vault_zbtc_account_info = &ctx.accounts.vault_zbtc_token_account.to_account_info();
    let updated_vault_zbtc_account: TokenAccount = AccountDeserialize::try_deserialize(
        &mut &vault_zbtc_account_info.data.borrow()[..],
    )?;
    
    let vault_zbtc_balance_after = updated_vault_zbtc_account.amount;
    let zbtc_received = vault_zbtc_balance_after
        .checked_sub(vault_zbtc_balance_before)
        .ok_or(RoundError::InvalidPriceData)?;
    
    msg!("ZBTC received from swap: {}", zbtc_received);
    
    // Step 8: Verify winner remaining accounts
    msg!("Step 8: Verifying remaining accounts for winners");
    // We've already used the first N remaining accounts for Jupiter swap
    // The next batch is for the winner token accounts
    let winner_accounts_start_index = accounts_len;
    require!(
        ctx.remaining_accounts.len() >= winner_accounts_start_index + winner_addresses.len(),
        RoundError::InvalidRemainingAccounts
    );
    
    // Step 9: Get PDA signer seeds for transfers
    msg!("Step 9: Getting PDA signer seeds");
    let (_, bump) = find_vault_authority_pda();
    let vault_authority_seeds = &[b"vault_authority".as_ref(), &[bump]];
    let signer_seeds = &[&vault_authority_seeds[..]];
        
    // Step 10: Distribute ZBTC to winners
    msg!("Step 10: Distributing ZBTC to winners");
    
    for i in 0..winner_addresses.len() {
        let winner_address = &winner_addresses[i];
        let ratio = winner_ratios[i];
        let winner_token_account = &ctx.remaining_accounts[winner_accounts_start_index + i];
        
        let winner_share = zbtc_received
            .checked_mul(ratio)
            .and_then(|x| x.checked_div(100))
            .ok_or(RoundError::InvalidPriceData)?;

        if winner_share > 0 {
            // Verify this token account belongs to the winner by checking its data
            let expected_token_address = get_associated_token_address(
                winner_address,
                &zbtc_mint()
            );
            
            require!(
                winner_token_account.key() == expected_token_address,
                RoundError::InvalidTokenAccount
            );
            
            msg!("Winner {} share: {} ZBTC", winner_address, winner_share);
            
            let from_info = ctx.accounts.vault_zbtc_token_account.to_account_info();
            let authority_info = ctx.accounts.vault_authority.to_account_info();
            
            let cpi_accounts = Transfer {
                from: from_info,
                to: winner_token_account.clone(),
                authority: authority_info,
            };

            let cpi_program = ctx.accounts.zbtc_mint_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            
            anchor_spl::token_interface::transfer(cpi_ctx, winner_share)?;
        }
    }

    // Step 11: Burning reward tokens
    msg!("Step 11: Burning reward tokens");
    
    let round_key = ctx.accounts.round.key();
    let (_round_pda, _round_bump) = find_round_pda(round_number);
    
    let cpi_accounts = Burn {
        mint: ctx.accounts.reward_mint.to_account_info(),
        authority: ctx.accounts.round.to_account_info(),
        from: ctx.accounts.round_reward_token_account.to_account_info(),
    };
    
    let round_bump = ctx.bumps.round;
    // Store the bytes in a variable to extend its lifetime
    let round_number_bytes = round_number.to_le_bytes();
    let round_seeds = &[
        b"round".as_ref(),
        &round_number_bytes,
        &[round_bump],
    ];
    
    let burn_signer_seeds = &[&round_seeds[..]];
    let cpi_program = ctx.accounts.reward_mint_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, burn_signer_seeds);
    
    let round_participation_tokens = ctx.accounts.round_reward_token_account.amount;
    anchor_spl::token_interface::burn(cpi_ctx, round_participation_tokens)?;
    
    msg!("ZBTC rewards distributed successfully");
    Ok(())
} 