use anchor_lang::prelude::*;
use crate::state::bet::{Bet, BetStatus};
use crate::state::profile::Profile;

#[derive(Accounts)]
pub struct ResolveBet<'info> {
    #[account(mut)]
    pub resolver: Signer<'info>,
    
    /// CHECK: Creator is validated by checking bet.creator matches this account
    pub creator: AccountInfo<'info>,
    
    /// CHECK: Acceptor is validated by checking bet.acceptor matches this account
    pub acceptor: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"profile-", creator.key().as_ref()],
        bump = creator_profile.bump
    )]
    pub creator_profile: Account<'info, Profile>,
    
    #[account(
        mut,
        seeds = [b"profile-", acceptor.key().as_ref()],
        bump = acceptor_profile.bump
    )]
    pub acceptor_profile: Account<'info, Profile>,
    
    #[account(
        mut,
        constraint = bet.creator == creator.key() @ crate::error::BetError::InvalidBetCreator,
        constraint = bet.status == BetStatus::Accepted as u8 @ crate::error::BetError::InvalidBetStatus,
        constraint = bet.acceptor.is_some() @ crate::error::BetError::BetNotAccepted
    )]
    pub bet: Account<'info, Bet>,
    
    pub system_program: Program<'info, System>,
}

pub fn resolve_bet(
    ctx: Context<ResolveBet>,
    winner_is_creator: bool,
) -> Result<()> {
    let bet = &mut ctx.accounts.bet;
    let creator_profile = &mut ctx.accounts.creator_profile;
    let acceptor_profile = &mut ctx.accounts.acceptor_profile;
    let clock = Clock::get()?;
    
    // Determine winner
    let winner = if winner_is_creator {
        ctx.accounts.creator.key()
    } else {
        ctx.accounts.acceptor.key()
    };
    
    bet.winner = Some(winner);
    bet.status = BetStatus::Resolved as u8;
    bet.resolved_at = Some(clock.unix_timestamp);
    
    // Calculate profit for winner
    let profit = (bet.bet_amount as u128)
        .checked_mul(bet.odds_win as u128)
        .and_then(|x| x.checked_div(bet.odds_lose as u128))
        .ok_or(crate::error::BetError::ArithmeticOverflow)? as u64;
    
    if winner_is_creator {
        // Creator wins
        creator_profile.total_my_bet_wins += 1;
        creator_profile.total_profit = creator_profile.total_profit
            .checked_add(profit as i64)
            .ok_or(crate::error::BetError::ArithmeticOverflow)?;
        
        acceptor_profile.total_accepted_bet_losses += 1;
        acceptor_profile.total_profit = acceptor_profile.total_profit
            .checked_sub(bet.bet_amount as i64)
            .ok_or(crate::error::BetError::ArithmeticOverflow)?;
    } else {
        // Acceptor wins
        acceptor_profile.total_accepted_bet_wins += 1;
        acceptor_profile.total_profit = acceptor_profile.total_profit
            .checked_add(profit as i64)
            .ok_or(crate::error::BetError::ArithmeticOverflow)?;
        
        creator_profile.total_my_bet_losses += 1;
        creator_profile.total_profit = creator_profile.total_profit
            .checked_sub(bet.bet_amount as i64)
            .ok_or(crate::error::BetError::ArithmeticOverflow)?;
    }
    
    Ok(())
}

