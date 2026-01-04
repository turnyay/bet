use anchor_lang::prelude::*;
use crate::state::profile::Profile;

#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    
    #[account(
        init,
        payer = wallet,
        space = Profile::LEN,
        seeds = [b"profile-", wallet.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, Profile>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_profile(ctx: Context<CreateProfile>, name: [u8; 32]) -> Result<()> {
    let profile = &mut ctx.accounts.profile;
    let clock = Clock::get()?;
    
    profile.wallet = ctx.accounts.wallet.key();
    profile.name = name;
    profile.total_my_bet_count = 0;
    profile.total_bets_accepted_count = 0;
    profile.total_my_bet_wins = 0;
    profile.total_my_bet_losses = 0;
    profile.total_accepted_bet_wins = 0;
    profile.total_accepted_bet_losses = 0;
    profile.total_my_bet_profit = 0;
    profile.total_accepted_bet_profit = 0;
    profile.total_my_bet_volume = 0;
    profile.total_accepted_bet_volume = 0;
    profile.created_at = clock.unix_timestamp;
    profile.version = 1;
    profile.bump = ctx.bumps.profile;
    profile._padding = [0; 7];
    
    Ok(())
}

