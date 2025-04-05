use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke, program_error::ProgramError},
};
use anchor_spl::token_interface::{Mint, MintTo, TokenAccount, TokenInterface};

use crate::{
    state::{Round, RoundState, UserData, VaultData},
    errors::{RoundError, SwapError},
    utils::{find_vault_authority_pda, wsol_mint, inf_mint, chip_token_mint, STAKE_RATIO, jupiter_program_id},
};

// Using a dynamic check for Jupiter program instead of direct import
#[derive(Accounts)]
#[instruction(round_number: u64)]
pub struct UserSwap<'info> {
    // User is the wallet owner and transaction signer
    #[account(mut)]
    pub user: Signer<'info>,
    
    // Add constraint to check input mint is WSOL
    #[account(
        constraint = input_mint.key() == wsol_mint() @ SwapError::InvalidInputMint
    )]
    pub input_mint: InterfaceAccount<'info, Mint>,
    pub input_mint_program: Interface<'info, TokenInterface>,
    
    // Add constraint to check output mint is INF
    #[account(
        constraint = output_mint.key() == inf_mint() @ SwapError::InvalidOutputMint
    )]
    pub output_mint: InterfaceAccount<'info, Mint>,
    pub output_mint_program: Interface<'info, TokenInterface>,

    // Add constraint to check user's input token account is WSOL
    #[account(
        mut,
        associated_token::mint = input_mint,
        associated_token::authority = user,
        associated_token::token_program = input_mint_program,
        constraint = user_input_token_account.mint == wsol_mint() @ SwapError::InvalidInputTokenAccount
    )]
    pub user_input_token_account: InterfaceAccount<'info, TokenAccount>,

    // Add constraint to check vault's token account is INF
    #[account(
        mut,
        associated_token::mint = output_mint,
        associated_token::authority = vault_authority,
        associated_token::token_program = output_mint_program,
        constraint = vault_token_account.mint == inf_mint() @ SwapError::InvalidVaultTokenAccount
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: This is the program's vault authority PDA
    #[account(
        seeds = [b"vault_authority"],
        bump,
    )]
    pub vault_authority: AccountInfo<'info>,

    /// CHECK: This is Jupiter program with address verified
    #[account(
        address = jupiter_program_id() @ ProgramError::IncorrectProgramId
    )]
    pub jupiter_program: AccountInfo<'info>,

    // Add reward token accounts
    #[account(
        mut,
        address = chip_token_mint()
    )]
    pub reward_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = user,
        associated_token::token_program = reward_mint_program,
    )]
    pub user_reward_token_account: InterfaceAccount<'info, TokenAccount>,


    pub reward_mint_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    
    #[account(
        mut,
        seeds = [b"user_data", user.key().as_ref()],
        bump,
    )]
    pub user_data: Account<'info, UserData>,

    #[account(
        seeds = [b"vault_data"],
        bump,
    )]
    pub vault_data: Account<'info, VaultData>,

    #[account(
        mut,
        seeds = [b"round", round_number.to_le_bytes().as_ref()],
        bump,
    )]
    pub round: Account<'info, Round>,
}

pub fn deposit_sol(ctx: Context<UserSwap>, round_number: u64, data: Vec<u8>) -> Result<()> {
    msg!("Step 1: Starting deposit function");

    // Verify round is active
    msg!("Step 2: Verifying round state");
    require!(
        ctx.accounts.round.state != RoundState::Closed,
        RoundError::InvalidRoundState
    );

    // Verify round number matches
    msg!("Step 3: Verifying round number");
    require!(
        ctx.accounts.round.round_number == round_number,
        RoundError::InvalidRoundNumber
    );

    msg!("Step 4: Getting initial balances");
    let user_balance_before = ctx.accounts.user_input_token_account.amount;
    let vault_balance_before = ctx.accounts.vault_token_account.amount;

    msg!("Step 5: Preparing Jupiter swap accounts");
    let accounts: Vec<AccountMeta> = ctx
        .remaining_accounts
        .iter()
        .map(|acc| {
            AccountMeta {
                pubkey: *acc.key,
                is_signer: acc.key == &ctx.accounts.user.key() && acc.is_signer,
                is_writable: acc.is_writable,
            }
        })
        .collect();

    let accounts_infos: Vec<AccountInfo> = ctx
        .remaining_accounts
        .iter()
        .map(|acc| AccountInfo { ..acc.clone() })
        .collect();

    // Execute the Jupiter swap instruction
    msg!("Step 6: Executing Jupiter swap");
    invoke(
        &Instruction {
            program_id: ctx.accounts.jupiter_program.key(),
            accounts,
            data,
        },
        &accounts_infos,
    )?;

    msg!("Step 7: Getting updated account balances");
    let vault_token_account_info = &ctx.accounts.vault_token_account.to_account_info();
    let updated_vault_token_account: TokenAccount = AccountDeserialize::try_deserialize(
        &mut &vault_token_account_info.data.borrow()[..],
    )?;

    let user_token_account_info = &ctx.accounts.user_input_token_account.to_account_info();
    let updated_user_token_account: TokenAccount = AccountDeserialize::try_deserialize(
        &mut &user_token_account_info.data.borrow()[..],
    )?;

    let vault_balance_after = updated_vault_token_account.amount;
    let user_balance_after = updated_user_token_account.amount;
    
    msg!("Step 8: Verifying swap direction");
    // Verify SOL decreased and INF increased
    require!(
        user_balance_after < user_balance_before,
        SwapError::InvalidSwapDirection
    );
    require!(
        vault_balance_after > vault_balance_before,
        SwapError::InvalidSwapDirection
    );

    msg!("Step 9: Calculating differences");
    // Calculate exact differences
    let sol_deposited = user_balance_before
        .checked_sub(user_balance_after)
        .unwrap();
    let inf_received = vault_balance_after
        .checked_sub(vault_balance_before)
        .unwrap();

    msg!("Step 10: Updating round statistics");
    // Update round statistics
    ctx.accounts.round.total_sol_deposited = ctx.accounts.round.total_sol_deposited
        .checked_add(sol_deposited)
        .unwrap();
    ctx.accounts.round.total_inf_received = ctx.accounts.round.total_inf_received
        .checked_add(inf_received)
        .unwrap();

    msg!("Step 11: Updating user data");
    // Update user data with SOL deposited and INF received
    ctx.accounts.user_data.total_sol_deposited = ctx.accounts.user_data.total_sol_deposited
        .checked_add(sol_deposited)
        .unwrap();
    ctx.accounts.user_data.total_inf_equivalent = ctx.accounts.user_data.total_inf_equivalent
        .checked_add(inf_received)
        .unwrap();

    msg!("Step 12: Updating vault data");
    // Update vault data
    if ctx.accounts.vault_data.total_principal_sol == 0 {
        // Initialize vault data if it's a new account
        ctx.accounts.vault_data.total_principal_sol = 0;
    }
    
    // Update total principal SOL
    ctx.accounts.vault_data.total_principal_sol = ctx.accounts.vault_data.total_principal_sol
        .checked_add(sol_deposited)
        .unwrap();

    msg!("Step 13: Calculating reward amount");
    // Calculate reward amount (1 reward token per 0.001 SOL)
    let reward_amount = sol_deposited
        .checked_div(STAKE_RATIO)
        .unwrap();

    msg!("Step 14: Preparing PDA signer");
    // Get PDA signer seeds for minting
    let (_, bump) = find_vault_authority_pda();
    let vault_authority_seeds = &[b"vault_authority".as_ref(), &[bump]];
    let signer_seeds = &[&vault_authority_seeds[..]];

    msg!("Step 15: Minting reward tokens");
    // Mint reward tokens to the user
    let cpi_accounts = MintTo {
        mint: ctx.accounts.reward_mint.to_account_info(),
        to: ctx.accounts.user_reward_token_account.to_account_info(),
        authority: ctx.accounts.vault_authority.to_account_info(),
    };

    let cpi_program = ctx.accounts.reward_mint_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(
        cpi_program,
        cpi_accounts,
        signer_seeds
    );
    
    anchor_spl::token_interface::mint_to(cpi_ctx, reward_amount)?;

    msg!("Step 16: Logging transaction details");
    // Log all the changes
    msg!("SOL decreased by: {}", sol_deposited);
    msg!("INF increased by: {}", inf_received);
    msg!("Reward tokens minted: {} (1 token per 0.001 SOL)", reward_amount);
    msg!("Total vault principal SOL: {}", ctx.accounts.vault_data.total_principal_sol);

    // Calculate and log exchange rate (INF per SOL)
    msg!("Exchange rate: {} INF per SOL", inf_received
        .checked_mul(1_000_000) // Scale by 10^6 for precision
        .and_then(|x| x.checked_div(sol_deposited))
        .unwrap_or(0));

    // Log round statistics
    msg!("Round {} statistics:", ctx.accounts.round.round_number);
    msg!("Total SOL deposited: {}", ctx.accounts.round.total_sol_deposited);
    msg!("Total INF received: {}", ctx.accounts.round.total_inf_received);


    msg!(
        "User participated: user={} round={}",
        ctx.accounts.user.key(),
        ctx.accounts.round.round_number,
    );

    msg!("Step 17: Deposit function completed successfully");
    Ok(())
} 