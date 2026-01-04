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

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum BetCategory {
    Sports = 0,
    PersonalGrowth = 1,
    Politics = 2,
    Crypto = 3,
    WorldEvents = 4,
    Entertainment = 5,
    Technology = 6,
    Business = 7,
    Weather = 8,
    Other = 9,
}

#[account]
#[repr(C)]
pub struct Bet {
    pub creator: Pubkey,                    // Wallet of bet creator
    pub acceptor: Option<Pubkey>,            // Wallet of bet acceptor (None if not accepted)
    pub creator_username: [u8; 32],          // Username of bet creator (32 bytes)
    pub acceptor_username: [u8; 32],        // Username of bet acceptor (32 bytes, zeroed if not accepted)
    pub bet_amount: u64,                    // Amount in lamports
    pub description: [u8; 128],             // Bet description (128 bytes - byte-aligned)
    pub referee_type: u8,                   // RefereeType enum value
    pub category: u8,                       // BetCategory enum value
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
        + 32                     // creator_username
        + 32                     // acceptor_username
        + 8                      // bet_amount
        + 128                    // description
        + 1                      // referee_type
        + 1                      // category
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

