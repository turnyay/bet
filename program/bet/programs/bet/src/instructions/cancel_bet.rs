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

pub fn cancel_bet(ctx: Context<CancelBet>) -> Result<()> {
    // Get bet key and treasury bump before mutable borrow
    let bet_key = ctx.accounts.bet.key();
    let treasury_bump = ctx.bumps.treasury;
    
    let bet = &mut ctx.accounts.bet;
    
    // Can only cancel if bet hasn't been accepted (status check already ensures it's Open)
    require!(
        bet.acceptor.is_none(),
        crate::error::BetError::BetAlreadyAccepted
    );
    
    // Get treasury balance (all SOL in treasury)
    let treasury_balance = ctx.accounts.treasury.lamports();
    
    // Transfer all SOL from treasury back to creator using system program
    // Must use invoke_signed because treasury is a PDA and needs program signature
    if treasury_balance > 0 {
        // Prepare seeds for PDA signing
        let seeds = &[
            b"bet-treasury-",
            bet_key.as_ref(),
            &[treasury_bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        anchor_lang::solana_program::program::invoke_signed(
            &anchor_lang::solana_program::system_instruction::transfer(
                ctx.accounts.treasury.key,
                ctx.accounts.creator.key,
                treasury_balance,
            ),
            &[
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.creator.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;
    }
    
    bet.status = BetStatus::Cancelled as u8;
    
    // Note: We don't decrement total_my_bet_count because the bet account still exists
    // The count represents total bets created, not active bets
    
    Ok(())
}

