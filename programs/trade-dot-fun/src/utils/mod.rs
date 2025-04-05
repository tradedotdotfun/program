use anchor_lang::prelude::*;
use std::str::FromStr;

// Constants for token mints
pub fn wsol_mint() -> Pubkey {
    Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap()
}

pub fn inf_mint() -> Pubkey {
    Pubkey::from_str("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm").unwrap()
}

pub fn reward_token_mint() -> Pubkey {
    Pubkey::from_str("chip6YRCCXMy1uLbGRNErT66aYGdaVsVCQ25VA1LWNN").unwrap()
}

// Add constant for stake ratio (0.001 SOL = 1 reward token)
pub const STAKE_RATIO: u64 = 1_000_000; // 0.001 SOL in lamports

// Pyth price feed ID constants
pub const INF_USD_PRICE_FEED_ID: &str = "0xf51570985c642c49c2d6e50156390fdba80bb6d5f7fa389d2f012ced4f7d208f";
pub const SOL_USD_PRICE_FEED_ID: &str = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
pub const MAXIMUM_AGE: u64 = 60; // 60 seconds maximum age

// Jupiter program ID
pub fn jupiter_program_id() -> Pubkey {
    Pubkey::from_str("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4").unwrap()
}

// Authorized pubkey for admin operations
pub fn authorized_admin() -> Pubkey {
    Pubkey::from_str("2qKn8e94V8HiemUQJ3vG13zC555TBbxFkmbqgU4tUDXJ").unwrap()
}

// Helper function to check if a signer is the authorized admin
pub fn check_authorized_admin(signer: &Pubkey) -> Result<()> {
    require!(
        *signer == authorized_admin(),
        crate::errors::RoundError::UnauthorizedUser
    );
    Ok(())
}

// PDA Finding functions
pub fn find_vault_authority_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"vault_authority"], &crate::ID)
}

pub fn find_user_data_pda(user: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"user_data", user.as_ref()],
        &crate::ID
    )
}

pub fn find_vault_data_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"vault_data"],
        &crate::ID
    )
}

pub fn find_round_pda(round_number: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"round", round_number.to_le_bytes().as_ref()],
        &crate::ID
    )
} 