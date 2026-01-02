import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import { Header } from '../components/Header';
import { PROGRAM_ID, BetClient } from '../lib/bet';

const MyBets: React.FC = () => {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const { connection } = useConnection();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [betAmount, setBetAmount] = useState<string>('1');
  const [description, setDescription] = useState<string>('');
  const [refereeType, setRefereeType] = useState<number>(0);
  const [oddsWin, setOddsWin] = useState<string>('3');
  const [oddsLose, setOddsLose] = useState<string>('1');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [creatingBet, setCreatingBet] = useState<boolean>(false);

  const setExpirationDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    setExpiresAt(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const calculatePayouts = () => {
    const amount = parseFloat(betAmount) || 0;
    const win = parseInt(oddsWin.trim(), 10) || 1;
    const lose = parseInt(oddsLose.trim(), 10) || 1;
    
    // Profit if you win: bet * win/lose ratio (not including your bet back)
    const yourProfit = (amount * win / lose).toFixed(2);
    // If you lose: they win your bet amount (not a calculated profit)
    const theirWin = amount.toFixed(2);
    
    return { yourProfit, theirWin };
  };

  const payouts = calculatePayouts();

  const handleCreateBet = async () => {
    // Check if wallet is connected and has required methods
    if (!wallet.publicKey || !wallet.signTransaction || !connection) {
      alert('Wallet not properly connected. Please connect your wallet and try again.');
      return;
    }

    if (!betAmount || !description || !expiresAt) {
      alert('Please fill in all required fields.');
      return;
    }

    // Validate description length (max 128 bytes)
    const descriptionBytes = Buffer.from(description, 'utf8');
    if (descriptionBytes.length > 128) {
      alert('Description must be 128 bytes or less.');
      return;
    }

    // Validate and convert odds - must be positive integers
    const oddsWinNum = parseInt(oddsWin.trim(), 10);
    const oddsLoseNum = parseInt(oddsLose.trim(), 10);
    
    if (isNaN(oddsWinNum) || oddsWinNum <= 0 || !oddsWin.trim()) {
      alert(`Win odds must be a positive whole number (e.g., 1, 2, 3). Got: "${oddsWin}"`);
      return;
    }
    
    if (isNaN(oddsLoseNum) || oddsLoseNum <= 0 || !oddsLose.trim()) {
      alert(`Lose odds must be a positive whole number (e.g., 1, 2, 3). Got: "${oddsLose}"`);
      return;
    }

    try {
      setCreatingBet(true);

      // Convert bet amount to lamports - use anchor.BN (like tests do)
      const betAmountLamports = new anchor.BN(Math.floor(parseFloat(betAmount) * 1e9));
      const oddsWinBN = new anchor.BN(oddsWinNum);
      const oddsLoseBN = new anchor.BN(oddsLoseNum);
      const expiresAtTimestamp = new anchor.BN(Math.floor(new Date(expiresAt).getTime() / 1000));
      
      // Convert description to [u8; 128] array
      const descriptionBytes = Buffer.from(description, 'utf8');
      const descriptionArray = new Array(128).fill(0);
      for (let i = 0; i < Math.min(128, descriptionBytes.length); i++) {
        descriptionArray[i] = descriptionBytes[i];
      }

      // Debug: Log all values before sending
      console.log('=== WEB SIDE DEBUG ===');
      console.log('betAmount:', betAmount);
      console.log('betAmountLamports (BN):', betAmountLamports.toString());
      console.log('oddsWinBN:', oddsWinBN.toString());
      console.log('oddsLoseBN:', oddsLoseBN.toString());
      console.log('expiresAt:', expiresAt);
      console.log('expiresAtTimestamp (BN):', expiresAtTimestamp.toString());

      // Create client - pass full wallet context
      const client = new BetClient(wallet as any, connection);
      const program = client.getProgram();
      const provider = program.provider as any;

      // Find profile PDA
      const [profilePda] = await PublicKey.findProgramAddress(
        [Buffer.from('profile-'), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Fetch profile to get bet count for PDA calculation
      const profileAccount = await program.account.profile.fetch(profilePda);
      const betIndex = profileAccount.totalMyBetCount as number;

      // Calculate bet PDA
      const betIndexBuffer = Buffer.alloc(4);
      betIndexBuffer.writeUInt32LE(betIndex, 0);
      const [betPda] = await PublicKey.findProgramAddress(
        [Buffer.from('bet'), wallet.publicKey.toBuffer(), betIndexBuffer],
        PROGRAM_ID
      );

      // Call create_bet instruction using .rpc() - use BN objects (Anchor 0.28.0 requires BN)
      const tx = await program.methods
        .createBet(
          betAmountLamports,    // anchor.BN for u64
          Array.from(descriptionArray), // [u8; 128]
          refereeType,          // u8
          oddsWinBN,            // anchor.BN for u64
          oddsLoseBN,           // anchor.BN for u64
          expiresAtTimestamp    // anchor.BN for i64
        )
        .accounts({
          creator: wallet.publicKey,
          profile: profilePda,
          bet: betPda,
          system_program: SystemProgram.programId,
        })
        .rpc();

      console.log('Create bet tx:', tx);
      
      // Wait for confirmation
      await connection.confirmTransaction(tx, 'confirmed');
      
      // Close modal and reset form
      setIsModalOpen(false);
      setBetAmount('1');
      setDescription('');
      setRefereeType(0);
      setOddsWin('3');
      setOddsLose('1');
      setExpiresAt('');
      
      alert('Bet created successfully!');
    } catch (error: any) {
      console.error('Error creating bet:', error);
      alert(`Failed to create bet: ${error.message || 'Please try again.'}`);
    } finally {
      setCreatingBet(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* Main Content */}
      <div 
        className="bet-scroll-container"
        style={{
          width: '100%',
          height: 'calc(100vh - 64px)',
          backgroundColor: '#1a1f35',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
        
        <div style={{
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px'
        }}>
          {/* My Bets Section */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#ffffff',
                margin: 0
              }}>
                My Bets
              </h2>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ff8c00',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff9500';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff8c00';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Make a Bet
              </button>
            </div>
            <div style={{
              backgroundColor: '#0a0e1a',
              borderRadius: '16px',
              padding: '40px',
              border: '1px solid #2a2f45',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '18px',
                color: '#888'
              }}>
                No bets yet. Create your first bet above!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Make a Bet Modal */}
      {isModalOpen && (
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
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#0a0e1a',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid #2a2f45',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
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
              Make a Bet
            </h2>

            {/* Bet Amount */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  fontSize: '18px',
                  color: '#ffffff'
                }}>
                  Bet Amount:
                </span>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#1a1f35',
                    color: '#ffffff',
                    fontSize: '16px',
                    width: '120px',
                    fontFamily: 'inherit'
                  }}
                />
                <span style={{
                  fontSize: '18px',
                  color: '#ffffff'
                }}>
                  SOL
                </span>
              </div>
            </div>

            {/* Description */}
            <div style={{
              marginBottom: '24px'
            }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '12px'
              }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={128}
                placeholder="Enter bet description (max 128 characters)"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #2a2f45',
                  backgroundColor: '#1a1f35',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
              />
              <div style={{
                fontSize: '12px',
                color: '#888',
                marginTop: '4px',
                textAlign: 'right'
              }}>
                {description.length}/128
              </div>
            </div>

            {/* Referee Type */}
            <div style={{
              marginBottom: '24px'
            }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '12px'
              }}>
                Referee Type
              </label>
              <select
                value={refereeType}
                onChange={(e) => setRefereeType(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #2a2f45',
                  backgroundColor: '#1a1f35',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <option value={0}>Honor System</option>
                <option value={1}>Oracle</option>
                <option value={2}>Third Party</option>
                <option value={3}>Smart Contract</option>
              </select>
            </div>

            {/* Odds Section */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <label style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffffff',
                  margin: 0
                }}>
                  Bet Odds
                </label>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap'
              }}>
                <input
                  type="number"
                  value={oddsWin}
                  onChange={(e) => setOddsWin(e.target.value)}
                  min="1"
                  step="1"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#1a1f35',
                    color: '#ffffff',
                    fontSize: '16px',
                    width: '80px',
                    textAlign: 'center',
                    fontFamily: 'inherit'
                  }}
                />
                <span style={{
                  fontSize: '18px',
                  color: '#ffffff',
                  fontWeight: 'bold'
                }}>
                  :
                </span>
                <input
                  type="number"
                  value={oddsLose}
                  onChange={(e) => setOddsLose(e.target.value)}
                  min="1"
                  step="1"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#1a1f35',
                    color: '#ffffff',
                    fontSize: '16px',
                    width: '80px',
                    textAlign: 'center',
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  onClick={() => {
                    const temp = oddsWin;
                    setOddsWin(oddsLose);
                    setOddsLose(temp);
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#1a1f35',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    width: '36px',
                    height: '36px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2a2f45';
                    e.currentTarget.style.borderColor = '#ff8c00';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a1f35';
                    e.currentTarget.style.borderColor = '#2a2f45';
                  }}
                  title="Switch odds"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#1a1f35',
                border: '1px solid #2a2f45'
              }}>
                <p style={{
                  fontSize: '14px',
                  color: '#888',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  If you win you profit <span style={{ color: '#ff8c00', fontWeight: 'bold' }}>${payouts.yourProfit}</span> if you lose they win <span style={{ color: '#ff8c00', fontWeight: 'bold' }}>${payouts.theirWin}</span>
                </p>
              </div>
            </div>

            {/* Expires At Section */}
            <div style={{
              marginTop: '24px'
            }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '12px'
              }}>
                Expires At
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '16px'
              }}>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#1a1f35',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    flex: 1,
                    minWidth: '200px'
                  }}
                />
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    onClick={() => setExpirationDate(1)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #2a2f45',
                      backgroundColor: '#1a1f35',
                      color: '#ffffff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2f45';
                      e.currentTarget.style.borderColor = '#ff8c00';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1a1f35';
                      e.currentTarget.style.borderColor = '#2a2f45';
                    }}
                  >
                    +1 day
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpirationDate(7)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #2a2f45',
                      backgroundColor: '#1a1f35',
                      color: '#ffffff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2f45';
                      e.currentTarget.style.borderColor = '#ff8c00';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1a1f35';
                      e.currentTarget.style.borderColor = '#2a2f45';
                    }}
                  >
                    +1 week
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpirationDate(30)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #2a2f45',
                      backgroundColor: '#1a1f35',
                      color: '#ffffff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2f45';
                      e.currentTarget.style.borderColor = '#ff8c00';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1a1f35';
                      e.currentTarget.style.borderColor = '#2a2f45';
                    }}
                  >
                    +1 month
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{
              marginTop: '32px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #2a2f45',
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1a1f35';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBet}
                disabled={creatingBet || !betAmount || !description || !expiresAt}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: creatingBet || !betAmount || !description || !expiresAt ? '#666' : '#ff8c00',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: creatingBet || !betAmount || !expiresAt ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (!creatingBet && betAmount && description && expiresAt) {
                    e.currentTarget.style.backgroundColor = '#ff9500';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creatingBet && betAmount && description && expiresAt) {
                    e.currentTarget.style.backgroundColor = '#ff8c00';
                  }
                }}
              >
                {creatingBet ? 'Creating...' : 'Create Bet'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bet-scroll-container::-webkit-scrollbar {
          width: 8px;
        }
        .bet-scroll-container::-webkit-scrollbar-track {
          background: #1a1f35;
        }
        .bet-scroll-container::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        .bet-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
        .bet-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: #333 #1a1f35;
        }
      `}</style>
    </div>
  );
};

export default MyBets;
