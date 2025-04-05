use anchor_lang::prelude::*;
use crate::state::UserData;

#[derive(Accounts)]
pub struct InitializeUserData<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8, // 8 (discriminator) + 32 (Pubkey) + 8 (total_sol_deposited) + 8 (total_inf_equivalent)
        seeds = [b"user_data", user.key().as_ref()],
        bump,
    )]
    pub user_data: Account<'info, UserData>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_user_data(ctx: Context<InitializeUserData>) -> Result<()> {
    let user_data = &mut ctx.accounts.user_data;
    user_data.user = ctx.accounts.user.key();
    user_data.total_sol_deposited = 0;
    user_data.total_inf_equivalent = 0;
    
    msg!("User data initialized for: {}", ctx.accounts.user.key());
    Ok(())
} 