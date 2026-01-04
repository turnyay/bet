use anchor_lang::prelude::*;
use crate::state::profile::Profile;
use crate::state::friend::Friend;

#[derive(Accounts)]
pub struct AddFriend<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_profile: Account<'info, Profile>,
    
    #[account(mut)]
    pub friend_profile: Account<'info, Profile>,
    
    // PDA uses sorted wallets (smaller wallet first) - frontend sorts before calling
    #[account(
        init,
        payer = user,
        space = Friend::LEN,
        seeds = [
            b"friend-",
            user.key().as_ref(),
            friend_profile.wallet.as_ref()
        ],
        bump
    )]
    pub friend_account: Account<'info, Friend>,
    
    pub system_program: Program<'info, System>,
}

pub fn add_friend(ctx: Context<AddFriend>) -> Result<()> {
    let clock = Clock::get()?;
    let user_profile = &ctx.accounts.user_profile;
    let friend_profile = &ctx.accounts.friend_profile;
    
    // Verify user owns their profile
    require!(
        user_profile.wallet == ctx.accounts.user.key(),
        crate::error::BetError::InvalidProfileOwner
    );
    
    // Verify user is not trying to add themselves
    require!(
        user_profile.wallet != friend_profile.wallet,
        crate::error::BetError::InvalidProfileOwner
    );
    
    // Frontend sorts wallets before deriving PDA, so user.key() is always the smaller wallet (user_a)
    // and friend_profile.wallet is always the larger wallet (user_b)
    let friend = &mut ctx.accounts.friend_account;
    friend.user_a_wallet = ctx.accounts.user.key();
    friend.user_a_username = user_profile.name;
    friend.user_a_status = 1; // user requested
    friend.user_b_wallet = friend_profile.wallet;
    friend.user_b_username = friend_profile.name;
    friend.user_b_status = 0; // friend hasn't responded yet
    friend.created_at = clock.unix_timestamp;
    friend.version = 1;
    friend.bump = ctx.bumps.friend_account;
    friend._padding = [0; 5];
    
    Ok(())
}

