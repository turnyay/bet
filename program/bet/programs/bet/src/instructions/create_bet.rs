use anchor_lang::prelude::*;
use crate::state::bet::{Bet, BetStatus, RefereeType};
use crate::state::profile::Profile;

#[derive(Accounts)]
pub struct CreateBet<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"profile-", creator.key().as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, Profile>,
    
    #[account(
        init,
        payer = creator,
        space = Bet::LEN,
        seeds = [b"bet", creator.key().as_ref(), &profile.total_my_bet_count.to_le_bytes()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_bet(
    ctx: Context<CreateBet>,
    description: [u8; 256],
    bet_amount: u64,
    referee_type: u8,
    odds_win: u64,
    odds_lose: u64,
    expires_at: i64,
) -> Result<()> {
    let bet = &mut ctx.accounts.bet;
    let profile = &mut ctx.accounts.profile;
    let clock = Clock::get()?;
    
    // Validate referee type
    require!(
        referee_type <= RefereeType::SmartContract as u8,
        crate::error::BetError::InvalidRefereeType
    );
    
    // Validate odds
    require!(odds_win > 0 && odds_lose > 0, crate::error::BetError::InvalidOdds);
    
    // Validate expiration is in the future
    require!(expires_at > clock.unix_timestamp, crate::error::BetError::InvalidExpiration);
    
    // Note: bet_index is used in the PDA seeds during account initialization
    
    bet.creator = ctx.accounts.creator.key();
    bet.acceptor = None;
    bet.bet_amount = bet_amount;
    bet.description = description;
    bet.referee_type = referee_type;
    bet.odds_win = odds_win;
    bet.odds_lose = odds_lose;
    bet.expires_at = expires_at;
    bet.status = BetStatus::Open as u8;
    bet.winner = None;
    bet.created_at = clock.unix_timestamp;
    bet.accepted_at = None;
    bet.resolved_at = None;
    bet.version = 1;
    bet.bump = ctx.bumps.bet;
    bet._padding = [0; 6];
    
    // Increment creator's bet count after using it
    profile.total_my_bet_count += 1;
    
    Ok(())
}

