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
    
    /// CHECK: Treasury PDA for holding bet funds (must exist from create_bet)
    #[account(
        mut,
        seeds = [b"bet-treasury-", bet.key().as_ref()],
        bump
    )]
    /// CHECK: Treasury account
    pub treasury: UncheckedAccount<'info>,
    
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
    
    // Calculate acceptor's bet amount: creator bet * (oddsWin / oddsLose)
    // This ensures the payout ratios are correct
    let acceptor_bet_amount = bet.bet_amount
        .checked_mul(bet.odds_win)
        .and_then(|x| x.checked_div(bet.odds_lose))
        .ok_or(crate::error::BetError::ArithmeticOverflow)?;
    
    // Transfer acceptor's calculated bet amount to treasury using system program
    anchor_lang::solana_program::program::invoke(
        &anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.acceptor.key,
            ctx.accounts.treasury.key,
            acceptor_bet_amount,
        ),
        &[
            ctx.accounts.acceptor.to_account_info(),
            ctx.accounts.treasury.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
    
    bet.acceptor = Some(ctx.accounts.acceptor.key());
    bet.status = BetStatus::Accepted as u8;
    bet.accepted_at = Some(clock.unix_timestamp);
    
    // Increment acceptor's accepted bet count
    acceptor_profile.total_bets_accepted_count += 1;
    
    Ok(())
}

