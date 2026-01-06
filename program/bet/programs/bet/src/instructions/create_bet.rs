use anchor_lang::prelude::*;
use crate::state::bet::{Bet, BetStatus, RefereeType, BetAvailableTo};
use crate::state::profile::Profile;

#[derive(Accounts)]
pub struct CreateBet<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"username-", profile.name.as_ref()],
        bump = profile.bump,
        constraint = profile.wallet == creator.key() @ crate::error::BetError::InvalidProfileOwner
    )]
    pub profile: Account<'info, Profile>,
    
    /// CHECK: Referee account (creator for Honor System, designated for Third Party)
    pub referee: AccountInfo<'info>,
    
    #[account(
        init,
        payer = creator,
        space = Bet::LEN,
        seeds = [b"bet", creator.key().as_ref(), &profile.total_my_bet_count.to_le_bytes()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    
    /// CHECK: Treasury PDA for holding bet funds (will be created on first transfer)
    #[account(
        mut,
        seeds = [b"bet-treasury-", bet.key().as_ref()],
        bump
    )]
    /// CHECK: Treasury account
    pub treasury: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
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
    bet_available_to: u8,
    private_bet_recipient: Option<Pubkey>,
) -> Result<()> {
    let bet = &mut ctx.accounts.bet;
    let profile = &mut ctx.accounts.profile;
    let clock = Clock::get()?;
    
    // Validate referee type - only allow Honor System (0) or Third Party (2)
    require!(
        referee_type == RefereeType::HonorSystem as u8 || referee_type == RefereeType::ThirdParty as u8,
        crate::error::BetError::InvalidRefereeType
    );
    
    // Set referee based on type
    let referee_pubkey = if referee_type == RefereeType::HonorSystem as u8 {
        // For Honor System, referee is the creator
        ctx.accounts.creator.key()
    } else {
        // For Third Party, referee is the designated referee account
        ctx.accounts.referee.key()
    };
    
    // Log all input values
    msg!("=== CREATE BET DEBUG LOG ===");
    msg!("bet_amount: {}", bet_amount);
    msg!("referee_type: {}", referee_type);
    msg!("referee: {}", referee_pubkey);
    msg!("odds_win: {}", odds_win);
    msg!("odds_lose: {}", odds_lose);
    msg!("expires_at: {}", expires_at);
    msg!("current_timestamp: {}", clock.unix_timestamp);
    msg!("creator: {}", ctx.accounts.creator.key());
    msg!("profile.total_my_bet_count: {}", profile.total_my_bet_count);
    msg!("=== END DEBUG LOG ===");
    
    bet.referee = referee_pubkey;
    bet.creator = ctx.accounts.creator.key();
    bet.acceptor = None;
    bet.creator_username = profile.name;
    bet.acceptor_username = [0; 32]; // Zeroed until accepted
    bet.bet_amount = bet_amount;
    bet.description = description;
    bet.referee_type = referee_type;
    bet.category = category;
    bet.odds_win = odds_win;
    bet.odds_lose = odds_lose;
    bet.expires_at = expires_at;
    bet.status = BetStatus::Open as u8;
    bet.winner = None;
    bet.created_at = clock.unix_timestamp;
    bet.accepted_at = None;
    bet.resolved_at = None;
    bet.bet_available_to = bet_available_to;
    bet.private_bet_recipient = private_bet_recipient;
    bet.version = 1;
    bet.bump = ctx.bumps.bet;
    bet._padding = [0; 5];
    
    // Transfer creator's bet amount to treasury using system program
    anchor_lang::solana_program::program::invoke(
        &anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.creator.key,
            ctx.accounts.treasury.key,
            bet_amount,
        ),
        &[
            ctx.accounts.creator.to_account_info(),
            ctx.accounts.treasury.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
    
    // Increment creator's bet count after using it
    profile.total_my_bet_count += 1;
    
    Ok(())
}

