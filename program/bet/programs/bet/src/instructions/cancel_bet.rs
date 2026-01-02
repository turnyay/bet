use anchor_lang::prelude::*;
use crate::state::bet::{Bet, BetStatus};
use crate::state::profile::Profile;

#[derive(Accounts)]
pub struct CancelBet<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"profile-", creator.key().as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, Profile>,
    
    #[account(
        mut,
        constraint = bet.creator == creator.key() @ crate::error::BetError::Unauthorized,
        constraint = bet.status == BetStatus::Open as u8 @ crate::error::BetError::InvalidBetStatus
    )]
    pub bet: Account<'info, Bet>,
    
    pub system_program: Program<'info, System>,
}

pub fn cancel_bet(ctx: Context<CancelBet>) -> Result<()> {
    let bet = &mut ctx.accounts.bet;
    let clock = Clock::get()?;
    
    // Can only cancel if bet hasn't expired and hasn't been accepted
    require!(
        bet.expires_at > clock.unix_timestamp,
        crate::error::BetError::BetExpired
    );
    
    require!(
        bet.acceptor.is_none(),
        crate::error::BetError::BetAlreadyAccepted
    );
    
    bet.status = BetStatus::Cancelled as u8;
    
    // Note: We don't decrement total_my_bet_count because the bet account still exists
    // The count represents total bets created, not active bets
    
    Ok(())
}

