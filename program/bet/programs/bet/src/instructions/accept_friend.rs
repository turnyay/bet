use anchor_lang::prelude::*;
use crate::state::friend::Friend;

#[derive(Accounts)]
pub struct AcceptFriend<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub friend_account: Account<'info, Friend>,
    
    pub system_program: Program<'info, System>,
}

pub fn accept_friend(ctx: Context<AcceptFriend>) -> Result<()> {
    let friend = &mut ctx.accounts.friend_account;
    let user_key = ctx.accounts.user.key();
    
    // Verify user is either user_a or user_b
    require!(
        friend.user_a_wallet == user_key || friend.user_b_wallet == user_key,
        crate::error::BetError::InvalidProfileOwner
    );
    
    // Determine which user this is and update both statuses to accepted
    if friend.user_a_wallet == user_key {
        // User is user_a, verify user_b has requested (status 1)
        require!(
            friend.user_b_status == 1,
            crate::error::BetError::InvalidBetStatus
        );
        // Update both to accepted status
        friend.user_a_status = 2;
        friend.user_b_status = 2;
    } else {
        // User is user_b, verify user_a has requested (status 1)
        require!(
            friend.user_a_status == 1,
            crate::error::BetError::InvalidBetStatus
        );
        // Update both to accepted status
        friend.user_a_status = 2;
        friend.user_b_status = 2;
    }
    
    Ok(())
}

