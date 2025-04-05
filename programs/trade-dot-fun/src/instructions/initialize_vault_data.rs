use anchor_lang::prelude::*;
use crate::state::VaultData;

#[derive(Accounts)]
pub struct InitializeVaultData<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 33 + 8 + 8, // 8 (discriminator) + 8 (u64) + 33 (Option<Pubkey>) + 8 (exchange_rate) + 8 (last_price_update)
        seeds = [b"vault_data"],
        bump,
    )]
    pub vault_data: Account<'info, VaultData>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_vault_data(ctx: Context<InitializeVaultData>) -> Result<()> {
    let vault_data = &mut ctx.accounts.vault_data;
    vault_data.total_principal_sol = 0;
    vault_data.current_round = 0;
    vault_data.exchange_rate = 0; // Initialize exchange rate to 0
    vault_data.last_price_update = Clock::get()?.unix_timestamp;
    msg!("Vault data initialized");
    Ok(())
} 