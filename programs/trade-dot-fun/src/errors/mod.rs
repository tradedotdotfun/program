use anchor_lang::prelude::*;

#[error_code]
pub enum RedeemError {
    #[msg("The vault does not have enough tokens to fulfill this redemption")]
    InsufficientVaultBalance,
    #[msg("Invalid user account")]
    InvalidUserAccount,
    #[msg("User has no principal SOL deposited")]
    NoPrincipal,
    #[msg("Invalid price data from oracle")]
    InvalidPriceData,
    #[msg("Exchange rate decreased, cannot redeem at this time")]
    ExchangeRateDecrease,
}

#[error_code]
pub enum SwapError {
    #[msg("Invalid input mint. Expected WSOL")]
    InvalidInputMint,
    #[msg("Invalid output mint. Expected INF")]
    InvalidOutputMint,
    #[msg("Invalid input token account. Expected WSOL token account")]
    InvalidInputTokenAccount,
    #[msg("Invalid vault token account. Expected INF token account")]
    InvalidVaultTokenAccount,
    #[msg("Invalid swap direction")]
    InvalidSwapDirection,
}

#[error_code]
pub enum RoundError {
    #[msg("Invalid round state for this operation")]
    InvalidRoundState,
    #[msg("Invalid round number")]
    InvalidRoundNumber,
    #[msg("Invalid price oracle data")]
    InvalidPriceData,
    #[msg("No rewards to distribute")]
    NoRewardsToDistribute,
    #[msg("Invalid winner data")]
    InvalidWinnerData,
    #[msg("Invalid remaining accounts")]
    InvalidRemainingAccounts,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Unauthorized user for this operation")]
    UnauthorizedUser,
} 