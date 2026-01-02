use anchor_lang::prelude::*;

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum RefereeType {
    HonorSystem = 0,
    Oracle = 1,
    ThirdParty = 2,
    SmartContract = 3,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum BetStatus {
    Open = 0,        // Bet created, waiting for acceptance
    Accepted = 1,    // Bet accepted by another party
    Cancelled = 2,    // Bet cancelled by creator
    Resolved = 3,     // Bet resolved (winner determined)
}

#[account]
#[repr(C)]
pub struct Bet {
    pub creator: Pubkey,                    // Wallet of bet creator
    pub acceptor: Option<Pubkey>,            // Wallet of bet acceptor (None if not accepted)
    pub bet_amount: u64,                    // Amount in lamports
    pub description: [u8; 256],             // Bet description (256 bytes)
    pub referee_type: u8,                   // RefereeType enum value
    pub odds_win: u64,                      // Odds numerator (e.g., 3 in 3:1)
    pub odds_lose: u64,                     // Odds denominator (e.g., 1 in 3:1)
    pub expires_at: i64,                    // Unix timestamp when bet expires
    pub status: u8,                          // BetStatus enum value
    pub winner: Option<Pubkey>,             // Winner wallet (None if not resolved)
    pub created_at: i64,                    // Timestamp when bet was created
    pub accepted_at: Option<i64>,           // Timestamp when bet was accepted
    pub resolved_at: Option<i64>,           // Timestamp when bet was resolved
    pub version: u8,                        // For future upgrades
    pub bump: u8,                           // PDA bump
    pub _padding: [u8; 6],                  // padding for alignment
}

impl Bet {
    pub const LEN: usize = 8     // discriminator
        + 32                     // creator
        + 33                     // acceptor (Option<Pubkey>)
        + 8                      // bet_amount
        + 256                    // description
        + 1                      // referee_type
        + 8                      // odds_win
        + 8                      // odds_lose
        + 8                      // expires_at
        + 1                      // status
        + 33                     // winner (Option<Pubkey>)
        + 8                      // created_at
        + 9                      // accepted_at (Option<i64>)
        + 9                      // resolved_at (Option<i64>)
        + 1                      // version
        + 1                      // bump
        + 6;                     // padding
}

