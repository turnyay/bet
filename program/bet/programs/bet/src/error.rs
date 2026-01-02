use anchor_lang::prelude::*;

#[error_code]
pub enum BetError {
    #[msg("Invalid referee type.")]
    InvalidRefereeType,
    
    #[msg("Invalid odds. Both values must be greater than 0.")]
    InvalidOdds,
    
    #[msg("Invalid expiration time. Must be in the future.")]
    InvalidExpiration,
    
    #[msg("Unauthorized action.")]
    Unauthorized,
    
    #[msg("Invalid bet status for this operation.")]
    InvalidBetStatus,
    
    #[msg("Bet has expired.")]
    BetExpired,
    
    #[msg("Bet has already been accepted.")]
    BetAlreadyAccepted,
    
    #[msg("Cannot accept your own bet.")]
    CannotAcceptOwnBet,
    
    #[msg("Invalid bet creator.")]
    InvalidBetCreator,
    
    #[msg("Bet has not been accepted yet.")]
    BetNotAccepted,
    
    #[msg("Arithmetic overflow occurred.")]
    ArithmeticOverflow,
}

