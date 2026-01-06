import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';

interface BetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  description: string;
  amount: number;
  ratio: string;
  status: number;
  expiresAt: number;
  createdAt: number;
  category: number | string;
  refereeType: number;
  creatorDisplay: string;
  creatorPublicKey?: PublicKey | null;
  acceptorDisplay: string | null;
  statusText: string;
  statusColor: string;
  categoryText: string;
  refereeTypeText: string;
  refereeUsername?: string | null;
  pnl?: number | null;
  oddsWin?: number;
  oddsLose?: number;
  winner?: PublicKey | null;
  showActions?: boolean;
  onAcceptBet?: () => void;
  onCancelBet?: () => void;
  acceptingBet?: boolean;
  cancellingBet?: boolean;
  isCreator?: boolean;
  currentUserPublicKey?: PublicKey | null;
  showResolveButtons?: boolean;
  onResolveBet?: (winnerIsCreator: boolean) => void;
  resolvingBet?: boolean;
  canResolve?: boolean;
}

export const BetDetailsModal: React.FC<BetDetailsModalProps> = ({
  isOpen,
  onClose,
  description,
  amount,
  ratio,
  status,
  expiresAt,
  createdAt,
  category,
  refereeType,
  creatorDisplay,
  creatorPublicKey,
  acceptorDisplay,
  statusText,
  statusColor,
  categoryText,
  refereeTypeText,
  refereeUsername,
  pnl,
  oddsWin,
  oddsLose,
  winner,
  showActions = false,
  onAcceptBet,
  onCancelBet,
  acceptingBet = false,
  cancellingBet = false,
  isCreator = false,
  currentUserPublicKey,
  showResolveButtons = false,
  onResolveBet,
  resolvingBet = false,
  canResolve = false,
}) => {
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // Fetch SOL price
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        // Try Binance API first (supports CORS)
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
        const data = await response.json();
        if (data && data.price) {
          setSolPrice(parseFloat(data.price));
        }
      } catch (err) {
        console.error('Error fetching SOL price:', err);
        // Fallback: try alternative API
        try {
          const fallbackResponse = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=SOL');
          const fallbackData = await fallbackResponse.json();
          if (fallbackData && fallbackData.data && fallbackData.data.rates && fallbackData.data.rates.USD) {
            setSolPrice(parseFloat(fallbackData.data.rates.USD));
          }
        } catch (fallbackErr) {
          console.error('Error fetching SOL price from fallback:', fallbackErr);
        }
      }
    };

    if (isOpen) {
      fetchSolPrice();
      // Refresh price every 60 seconds
      const priceInterval = setInterval(fetchSolPrice, 60000);
      return () => clearInterval(priceInterval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const calculateOddsDescription = () => {
    let oddsWinNum: number;
    let oddsLoseNum: number;
    
    if (oddsWin && oddsLose) {
      oddsWinNum = oddsWin;
      oddsLoseNum = oddsLose;
    } else {
      oddsWinNum = parseFloat(ratio.split(' : ')[0]);
      oddsLoseNum = parseFloat(ratio.split(' : ')[1]);
    }
    
    const acceptorBetAmount = amount * (oddsWinNum / oddsLoseNum);
    const creatorEarns = acceptorBetAmount;
    const creatorLoses = amount;
    
    if (solPrice !== null) {
      const creatorEarnsUsd = creatorEarns * solPrice;
      const creatorLosesUsd = creatorLoses * solPrice;
      return `If completed the creator earns ${creatorEarns.toFixed(4)} SOL ($${creatorEarnsUsd.toFixed(2)}), if not loses ${creatorLoses.toFixed(4)} SOL ($${creatorLosesUsd.toFixed(2)})`;
    }
    return `If completed the creator earns ${creatorEarns.toFixed(4)} SOL, if not loses ${creatorLoses.toFixed(4)} SOL`;
  };

  const canAccept = status === 0 && 
    currentUserPublicKey && 
    !isCreator &&
    Math.floor(Date.now() / 1000) <= expiresAt;

  const canCancel = status === 0 && 
    currentUserPublicKey && 
    isCreator;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0a0e1a',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid #2a2f45',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#1a1f35',
            color: '#ffffff',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2a2f45';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1a1f35';
          }}
        >
          ×
        </button>

        <h2 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: '24px',
          marginRight: '40px'
        }}>
          Bet Details
        </h2>

        {/* Description - Full Width */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            fontSize: '14px',
            color: '#888',
            marginBottom: '8px',
            display: 'block'
          }}>Description</label>
          <p style={{
            fontSize: '16px',
            color: '#ffffff',
            margin: 0,
            wordWrap: 'break-word'
          }}>{description || 'No description'}</p>
        </div>

        {/* Two Column Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '24px'
        }}>
          {/* Left Column */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Creator */}
            <div>
              <label style={{
                fontSize: '14px',
                color: '#888',
                marginBottom: '8px',
                display: 'block'
              }}>Creator</label>
              <p style={{
                fontSize: '16px',
                color: '#ffffff',
                margin: 0
              }}>
                {creatorDisplay}
              </p>
            </div>

            {/* Acceptor */}
            {acceptorDisplay ? (
              <div>
                <label style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '8px',
                  display: 'block'
                }}>Acceptor</label>
                <p style={{
                  fontSize: '16px',
                  color: '#ffffff',
                  margin: 0
                }}>
                  {acceptorDisplay}
                </p>
              </div>
            ) : (
              <div>
                <label style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '8px',
                  display: 'block'
                }}>Acceptor</label>
                <p style={{
                  fontSize: '16px',
                  color: '#888',
                  margin: 0
                }}>None</p>
              </div>
            )}

            {/* Amount and Profit/Loss */}
            <div style={{
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap'
            }}>
              <div>
                <label style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '8px',
                  display: 'block'
                }}>Bet Amount</label>
                <p style={{
                  fontSize: '16px',
                  color: '#ffffff',
                  margin: 0
                }}>
                  {amount.toFixed(4)} SOL
                  {solPrice !== null && (
                    <span style={{ color: '#888', marginLeft: '8px' }}>
                      (${(amount * solPrice).toFixed(2)})
                    </span>
                  )}
                </p>
              </div>
              {/* PNL */}
              {pnl !== null && pnl !== undefined && status === 3 && (
                <div>
                  <label style={{
                    fontSize: '14px',
                    color: '#888',
                    marginBottom: '8px',
                    display: 'block'
                  }}>Profit/Loss</label>
                  <p style={{
                    fontSize: '16px',
                    color: pnl >= 0 ? '#00d4aa' : '#ff6b6b',
                    fontWeight: '600',
                    margin: 0
                  }}>
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)} SOL
                  </p>
                </div>
              )}
            </div>

            {/* Odds */}
            <div>
              <label style={{
                fontSize: '14px',
                color: '#888',
                marginBottom: '8px',
                display: 'block'
              }}>{oddsWin && oddsLose ? 'Odds' : 'Creator Win Ratio'}</label>
              <p style={{
                fontSize: '16px',
                color: '#ff8c00',
                fontWeight: '600',
                margin: 0,
                marginBottom: '8px'
              }}>{ratio}</p>
              <p style={{
                fontSize: '14px',
                color: '#888',
                margin: 0,
                fontStyle: 'italic',
                lineHeight: '1.5'
              }}>
                {calculateOddsDescription()}
              </p>
              {/* Result for resolved bets */}
              {status === 3 && winner && creatorPublicKey && (
                <p style={{
                  fontSize: '14px',
                  color: winner.toBase58() === creatorPublicKey.toBase58() ? '#22c55e' : '#ef4444',
                  margin: '8px 0 0 0',
                  fontWeight: '600'
                }}>
                  {(() => {
                    const creatorWon = winner.toBase58() === creatorPublicKey.toBase58();
                    let solAmount: number;
                    if (creatorWon) {
                      if (oddsWin && oddsLose) {
                        solAmount = amount * (oddsWin / oddsLose);
                      } else {
                        // Parse from ratio string (e.g., "3 : 1")
                        const oddsWinNum = parseFloat(ratio.split(' : ')[0]);
                        const oddsLoseNum = parseFloat(ratio.split(' : ')[1]);
                        solAmount = amount * (oddsWinNum / oddsLoseNum);
                      }
                    } else {
                      solAmount = amount;
                    }
                    const creatorName = creatorDisplay.includes('(') 
                      ? creatorDisplay.split('(')[0].trim() 
                      : creatorDisplay;
                    return `Result: ${creatorName} ${creatorWon ? 'won' : 'lost'} ${creatorWon ? '+' : '-'}${solAmount.toFixed(2)} SOL`;
                  })()}
                </p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Category */}
            <div>
              <label style={{
                fontSize: '14px',
                color: '#888',
                marginBottom: '8px',
                display: 'block'
              }}>Category</label>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '6px',
                backgroundColor: '#2a2f45',
                border: '1px solid #3a3f55',
                color: '#ff8c00',
                fontSize: '12px',
                fontWeight: '500',
                textTransform: 'uppercase'
              }}>
                {categoryText}
              </span>
            </div>

            {/* Referee Type */}
            <div>
              <label style={{
                fontSize: '14px',
                color: '#888',
                marginBottom: '8px',
                display: 'block'
              }}>Referee Type</label>
              <p style={{
                fontSize: '16px',
                color: '#ffffff',
                margin: 0
              }}>
                {refereeType === 2 && refereeUsername 
                  ? `${refereeTypeText} (${refereeUsername})`
                  : refereeTypeText}
              </p>
            </div>

            {/* Status */}
            <div>
              <label style={{
                fontSize: '14px',
                color: '#888',
                marginBottom: '8px',
                display: 'block'
              }}>Status</label>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '6px',
                backgroundColor: status === 3 && winner && creatorPublicKey
                  ? (winner.toBase58() === creatorPublicKey.toBase58() ? '#22c55e' : '#ef4444')
                  : statusColor + '20',
                color: status === 3 && winner && creatorPublicKey
                  ? '#ffffff'
                  : statusColor,
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {status === 3 && winner && creatorPublicKey
                  ? (winner.toBase58() === creatorPublicKey.toBase58() ? 'RESOLVED - WIN' : 'RESOLVED - LOSE')
                  : statusText}
              </span>
            </div>

            {/* Expires At */}
            <div>
              <label style={{
                fontSize: '14px',
                color: '#888',
                marginBottom: '8px',
                display: 'block'
              }}>Expires At</label>
              <p style={{
                fontSize: '16px',
                color: '#ffffff',
                margin: 0
              }}>{new Date(expiresAt * 1000).toLocaleString()}</p>
            </div>

            {/* Created At */}
            <div>
              <label style={{
                fontSize: '14px',
                color: '#888',
                marginBottom: '8px',
                display: 'block'
              }}>Created At</label>
              <p style={{
                fontSize: '16px',
                color: '#ffffff',
                margin: 0
              }}>{new Date(createdAt * 1000).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Accept Bet Button */}
        {showActions && canAccept && onAcceptBet && (
          <button
            onClick={onAcceptBet}
            disabled={acceptingBet}
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: acceptingBet ? '#666' : '#ff8c00',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: acceptingBet ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '8px',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              if (!acceptingBet) {
                e.currentTarget.style.backgroundColor = '#ff9500';
              }
            }}
            onMouseLeave={(e) => {
              if (!acceptingBet) {
                e.currentTarget.style.backgroundColor = '#ff8c00';
              }
            }}
          >
            {acceptingBet ? 'Accepting...' : (() => {
              const oddsWinNum = parseFloat(ratio.split(' : ')[0]);
              const oddsLoseNum = parseFloat(ratio.split(' : ')[1]);
              const acceptorBetAmount = amount * (oddsWinNum / oddsLoseNum);
              if (solPrice !== null) {
                const acceptorBetAmountUsd = acceptorBetAmount * solPrice;
                return `Accept Bet for ${acceptorBetAmount.toFixed(4)} SOL ($${acceptorBetAmountUsd.toFixed(2)})`;
              }
              return `Accept Bet for ${acceptorBetAmount.toFixed(4)} SOL`;
            })()}
          </button>
        )}

        {/* Cancel Bet Button */}
        {showActions && canCancel && onCancelBet && (
          <button
            onClick={onCancelBet}
            disabled={cancellingBet}
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: '8px',
              border: '2px solid #ef4444',
              backgroundColor: cancellingBet ? '#666' : 'transparent',
              color: cancellingBet ? '#888' : '#ef4444',
              fontSize: '16px',
              fontWeight: '600',
              cursor: cancellingBet ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '8px',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              if (!cancellingBet) {
                e.currentTarget.style.backgroundColor = '#ef444420';
              }
            }}
            onMouseLeave={(e) => {
              if (!cancellingBet) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {cancellingBet ? 'Cancelling...' : 'Cancel Bet'}
          </button>
        )}

        {/* Resolve Bet Buttons */}
        {showResolveButtons && canResolve && onResolveBet && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '8px'
          }}>
            <button
              onClick={() => onResolveBet(true)}
              disabled={resolvingBet}
              style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: resolvingBet ? '#666' : '#22c55e',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: resolvingBet ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                if (!resolvingBet) {
                  e.currentTarget.style.backgroundColor = '#16a34a';
                }
              }}
              onMouseLeave={(e) => {
                if (!resolvingBet) {
                  e.currentTarget.style.backgroundColor = '#22c55e';
                }
              }}
            >
              {resolvingBet ? 'Resolving...' : 'Resolve Bet - Success'}
            </button>
            <button
              onClick={() => onResolveBet(false)}
              disabled={resolvingBet}
              style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: resolvingBet ? '#666' : '#ef4444',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: resolvingBet ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                if (!resolvingBet) {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }
              }}
              onMouseLeave={(e) => {
                if (!resolvingBet) {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                }
              }}
            >
              {resolvingBet ? 'Resolving...' : 'Resolve Bet - Fail'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

