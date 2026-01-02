use anchor_lang::prelude::*;
use crate::state::bet::{Bet, BetStatus};
use crate::state::profile::Profile;

#[derive(Accounts)]
pub struct AcceptBet<'info> {
    #[account(mut)]
    pub acceptor: Signer<'info>,
    
    /// CHECK: Creator is validated by checking bet.creator matches this account
    pub creator: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"profile-", acceptor.key().as_ref()],
        bump = acceptor_profile.bump
    )]
    pub acceptor_profile: Account<'info, Profile>,
    
    #[account(
        mut,
        constraint = bet.creator == creator.key() @ crate::error::BetError::InvalidBetCreator,
        constraint = bet.creator != acceptor.key() @ crate::error::BetError::CannotAcceptOwnBet,
        constraint = bet.status == BetStatus::Open as u8 @ crate::error::BetError::InvalidBetStatus,
        constraint = bet.acceptor.is_none() @ crate::error::BetError::BetAlreadyAccepted
    )]
    pub bet: Account<'info, Bet>,
    
    pub system_program: Program<'info, System>,
}

pub fn accept_bet(ctx: Context<AcceptBet>) -> Result<()> {
    let bet = &mut ctx.accounts.bet;
    let acceptor_profile = &mut ctx.accounts.acceptor_profile;
    let clock = Clock::get()?;
    
    // Validate bet hasn't expired
    require!(
        bet.expires_at > clock.unix_timestamp,
        crate::error::BetError::BetExpired
    );
    
    bet.acceptor = Some(ctx.accounts.acceptor.key());
    bet.status = BetStatus::Accepted as u8;
    bet.accepted_at = Some(clock.unix_timestamp);
    
    // Increment acceptor's accepted bet count
    acceptor_profile.total_bets_accepted_count += 1;
    
    Ok(())
}

