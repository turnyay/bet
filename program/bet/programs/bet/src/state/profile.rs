use anchor_lang::prelude::*;

#[account]
#[repr(C)]
pub struct Profile {
    pub wallet: Pubkey,                      // User's wallet address
    pub name: [u8; 32],                   // Username (32-byte fixed length)
    pub total_my_bet_count: u32,            // Total bets created by this user
    pub total_bets_accepted_count: u32,     // Total bets accepted by this user
    pub total_my_bet_wins: u32,              // Total wins from bets created
    pub total_my_bet_losses: u32,           // Total losses from bets created
    pub total_accepted_bet_wins: u32,        // Total wins from bets accepted
    pub total_accepted_bet_losses: u32,      // Total losses from bets accepted
    pub total_profit: i64,                   // Total profit/loss (can be negative)
    pub created_at: i64,                     // Timestamp when profile was created
    pub version: u8,                         // For future upgrades
    pub bump: u8,                           // PDA bump
    pub _padding: [u8; 7],                   // padding for alignment
}

impl Profile {
    pub const LEN: usize = 8     // discriminator
        + 32                     // wallet
        + 32                     // name
        + 4                      // total_my_bet_count
        + 4                      // total_bets_accepted_count
        + 4                      // total_my_bet_wins
        + 4                      // total_my_bet_losses
        + 4                      // total_accepted_bet_wins
        + 4                      // total_accepted_bet_losses
        + 8                      // total_profit
        + 8                      // created_at
        + 1                      // version
        + 1                      // bump
        + 7;                     // padding
}

