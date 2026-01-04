use anchor_lang::prelude::*;

#[account]
#[repr(C)]
pub struct Friend {
    pub user_a_wallet: Pubkey,            // First user's wallet (sorted)
    pub user_a_username: [u8; 32],         // First user's username
    pub user_a_status: u8,                // First user's status (0 = nothing, 1 = requested, 2 = accepted)
    pub user_b_wallet: Pubkey,            // Second user's wallet (sorted)
    pub user_b_username: [u8; 32],       // Second user's username
    pub user_b_status: u8,                // Second user's status (0 = nothing, 1 = requested, 2 = accepted)
    pub created_at: i64,                   // Timestamp when friend relationship was created
    pub version: u8,                      // For future upgrades
    pub bump: u8,                         // PDA bump
    pub _padding: [u8; 5],                // padding for alignment
}

impl Friend {
    pub const LEN: usize = 8     // discriminator
        + 32                     // user_a_wallet
        + 32                     // user_a_username
        + 1                      // user_a_status
        + 32                     // user_b_wallet
        + 32                     // user_b_username
        + 1                      // user_b_status
        + 8                      // created_at
        + 1                      // version
        + 1                      // bump
        + 5;                     // padding
}

