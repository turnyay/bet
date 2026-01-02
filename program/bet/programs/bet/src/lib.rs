use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod error;
pub mod constants;

pub use state::*;
pub use instructions::*;
pub use error::*;

declare_id!("8a6kHAGhMgMEJnhDEafuZf1JYc4a9rdWySJNQ311UhHD");

#[program]
pub mod bet {
    use super::*;

    pub fn create_profile(ctx: Context<CreateProfile>, name: [u8; 32]) -> Result<()> {
        instructions::create_profile(ctx, name)
    }

    pub fn create_bet(
        ctx: Context<CreateBet>,
        bet_amount: u64,
        description: [u8; 128],
        referee_type: u8,
        category: u8,
        odds_win: u64,
        odds_lose: u64,
        expires_at: i64,
    ) -> Result<()> {
        instructions::create_bet(
            ctx,
            bet_amount,
            description,
            referee_type,
            category,
            odds_win,
            odds_lose,
            expires_at,
        )
    }

    pub fn cancel_bet(ctx: Context<CancelBet>) -> Result<()> {
        instructions::cancel_bet(ctx)
    }

    pub fn accept_bet(ctx: Context<AcceptBet>) -> Result<()> {
        instructions::accept_bet(ctx)
    }

    pub fn resolve_bet(
        ctx: Context<ResolveBet>,
        winner_is_creator: bool,
    ) -> Result<()> {
        instructions::resolve_bet(ctx, winner_is_creator)
    }
}
