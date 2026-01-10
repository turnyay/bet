use anchor_lang::prelude::*;
use crate::state::bet::{Bet, BetStatus};

#[derive(Accounts)]
pub struct DeleteBet<'info> {
    /// CHECK: Anyone can call this instruction (permissionless)
    pub signer: Signer<'info>,
    
    /// CHECK: Creator account to receive rent (validated by bet.creator)
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    
    #[account(
        mut,
        close = creator,  // Close the bet account and send rent to creator
        constraint = bet.creator == creator.key() @ crate::error::BetError::InvalidBetCreator,
        constraint = bet.status == BetStatus::Cancelled as u8 || bet.status == BetStatus::Resolved as u8 @ crate::error::BetError::InvalidBetStatus
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

pub fn delete_bet(ctx: Context<DeleteBet>) -> Result<()> {
    // Get bet key and treasury bump before mutable borrow
    let bet_key = ctx.accounts.bet.key();
    let treasury_bump = ctx.bumps.treasury;
    
    // Get treasury balance (all SOL in treasury)
    let treasury_balance = ctx.accounts.treasury.lamports();
    
    // Transfer any remaining SOL from treasury back to creator using system program
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
    
    // The bet account will be closed automatically by Anchor's `close = creator` constraint
    // This sends the rent-exempt balance back to the creator
    
    Ok(())
}

