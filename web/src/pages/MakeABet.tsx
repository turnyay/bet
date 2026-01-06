import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import { Header } from '../components/Header';
import { PROGRAM_ID, BetClient, IDL } from '../lib/bet';

interface ExampleBet {
  description: string;
  oddsWin: number;
  oddsLose: number;
  expiryDays?: number; // Days from now, or undefined for end of year
  category: number;
}

const MakeABet: React.FC = () => {
  const navigate = useNavigate();
  const wallet = useWallet();
  const { publicKey } = wallet;
  const { connection } = useConnection();
  const [selectedCategory, setSelectedCategory] = useState<number>(1); // Personal Growth
  const [betAmount, setBetAmount] = useState<string>('1');
  const [description, setDescription] = useState<string>('');
  const [refereeType, setRefereeType] = useState<number>(0);
  const [category, setCategory] = useState<number>(1); // Personal Growth
  const [oddsWin, setOddsWin] = useState<string>('3');
  const [oddsLose, setOddsLose] = useState<string>('1');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [creatingBet, setCreatingBet] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [friends, setFriends] = useState<Array<{ wallet: string; username: string }>>([]);
  const [selectedReferee, setSelectedReferee] = useState<string>('');
  const [suggestionAmounts, setSuggestionAmounts] = useState<Record<string, string>>({});
  const [suggestionSelected, setSuggestionSelected] = useState<boolean>(false);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // Example bets by category
  const exampleBets: Record<number, ExampleBet[]> = {
    1: [ // Personal Growth
      {
        description: "I bet I will finish a marathon this year",
        oddsWin: 2,
        oddsLose: 1,
        expiryDays: undefined, // End of year
        category: 1
      },
      {
        description: "I bet I will go to the gym daily for the next week",
        oddsWin: 1,
        oddsLose: 3,
        expiryDays: 7,
        category: 1
      },
      {
        description: "I bet I can get 10,000 steps a day every day this month",
        oddsWin: 1,
        oddsLose: 1,
        expiryDays: 30,
        category: 1
      }
    ],
    0: [ // Sports
      {
        description: "I bet the NE Patriots win the superbowl 2026",
        oddsWin: 4,
        oddsLose: 1,
        expiryDays: undefined, // End of 2026
        category: 0
      },
      {
        description: "I bet Canada Hockey Team wins gold Olympics 2026",
        oddsWin: 2,
        oddsLose: 1,
        expiryDays: undefined, // End of 2026
        category: 0
      },
      {
        description: "I bet Italy will win the World Cup 2026",
        oddsWin: 3,
        oddsLose: 1,
        expiryDays: undefined, // End of 2026
        category: 0
      }
    ],
    3: [ // Crypto
      {
        description: "I bet SOL will reach $200 by end of year",
        oddsWin: 2,
        oddsLose: 1,
        expiryDays: undefined, // End of year
        category: 3
      },
      {
        description: "I bet BTC will be above $100k by end of 2025",
        oddsWin: 3,
        oddsLose: 1,
        expiryDays: undefined, // End of 2025
        category: 3
      },
      {
        description: "I bet ETH will reach $5000 by end of year",
        oddsWin: 2,
        oddsLose: 1,
        expiryDays: undefined, // End of year
        category: 3
      }
    ],
    9: [] // Other - no examples
  };

  const setExpirationDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    setExpiresAt(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const setEndOfYear = () => {
    const date = new Date();
    date.setMonth(11, 31); // December 31
    date.setHours(23, 59, 59, 999);
    const year = date.getFullYear();
    const month = String(12).padStart(2, '0');
    const day = String(31).padStart(2, '0');
    const hours = String(23).padStart(2, '0');
    const minutes = String(59).padStart(2, '0');
    setExpiresAt(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const handleExampleBetClick = (example: ExampleBet, exampleKey: string) => {
    setDescription(example.description);
    setOddsWin(example.oddsWin.toString());
    setOddsLose(example.oddsLose.toString());
    setCategory(example.category);
    
    // Use the SOL amount from this suggestion, or default to 1
    const amount = suggestionAmounts[exampleKey] || '1';
    setBetAmount(amount);
    
    if (example.expiryDays !== undefined) {
      setExpirationDate(example.expiryDays);
    } else {
      setEndOfYear();
    }
    
    // Hide suggestions after selection
    setSuggestionSelected(true);
  };

  const calculatePayouts = () => {
    const amount = parseFloat(betAmount) || 0;
    const win = parseInt(oddsWin.trim(), 10) || 1;
    const lose = parseInt(oddsLose.trim(), 10) || 1;
    
    const yourProfit = amount * win / lose;
    const theirWin = amount;
    
    return { 
      yourProfit: yourProfit.toFixed(4), 
      theirWin: theirWin.toFixed(4),
      yourProfitNum: yourProfit,
      theirWinNum: theirWin
    };
  };

  const payouts = calculatePayouts();

  useEffect(() => {
    if (publicKey && connection) {
      fetchAcceptedFriends();
    }
  }, [publicKey, connection]);

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

    fetchSolPrice();
    // Refresh price every 60 seconds
    const priceInterval = setInterval(fetchSolPrice, 60000);
    return () => clearInterval(priceInterval);
  }, []);

  const fetchAcceptedFriends = async () => {
    if (!publicKey || !connection) {
      setFriends([]);
      return;
    }

    try {
      const client = new BetClient(wallet as any, connection);
      const program = client.getProgram();
      
      const acceptedFriends: Array<{ wallet: string; username: string }> = [];
      
      const allFriends = await program.account.friend.all();
      
      for (const friendData of allFriends) {
        const friendAccount = friendData.account;
        const userAWallet = new PublicKey(friendAccount.userAWallet);
        const userBWallet = new PublicKey(friendAccount.userBWallet);
        const isUserA = userAWallet.toString() === publicKey.toString();
        const isUserB = userBWallet.toString() === publicKey.toString();
        
        if (!isUserA && !isUserB) {
          continue;
        }
        
        if (friendAccount.userAStatus === 2 || friendAccount.userBStatus === 2) {
          const otherWallet = isUserA ? userBWallet : userAWallet;
          const otherUsername = isUserA ? friendAccount.userBUsername : friendAccount.userAUsername;
          const username = Buffer.from(otherUsername).toString('utf8').replace(/\0/g, '').trim() || otherWallet.toString().slice(0, 8);
          
          acceptedFriends.push({
            wallet: otherWallet.toString(),
            username: username
          });
        }
      }
      
      setFriends(acceptedFriends);
    } catch (error) {
      console.error('Error fetching accepted friends:', error);
      setFriends([]);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const handleCreateBet = async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !connection) {
      alert('Wallet not properly connected. Please connect your wallet and try again.');
      return;
    }

    if (!betAmount || !description || !expiresAt) {
      alert('Please fill in all required fields.');
      return;
    }

    const descriptionBytes = Buffer.from(description, 'utf8');
    if (descriptionBytes.length > 128) {
      alert('Description must be 128 bytes or less.');
      return;
    }

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

      const betAmountLamports = new anchor.BN(Math.floor(parseFloat(betAmount) * 1e9));
      const oddsWinBN = new anchor.BN(oddsWinNum);
      const oddsLoseBN = new anchor.BN(oddsLoseNum);
      const expiresAtTimestamp = new anchor.BN(Math.floor(new Date(expiresAt).getTime() / 1000));
      
      const descriptionBytes = Buffer.from(description, 'utf8');
      const descriptionArray = new Array(128).fill(0);
      for (let i = 0; i < Math.min(128, descriptionBytes.length); i++) {
        descriptionArray[i] = descriptionBytes[i];
      }

      const client = new BetClient(wallet as any, connection);
      const program = client.getProgram();

      let profileAccount = null;
      let profilePda: PublicKey | null = null;
      
      try {
        const allProfiles = await program.account.profile.all();
        for (const profile of allProfiles) {
          if (profile.account.wallet.toString() === wallet.publicKey.toString()) {
            profileAccount = profile.account;
            const nameBytes = profileAccount.name as number[];
            const username = Buffer.from(nameBytes).toString('utf8').replace(/\0/g, '').trim();
            
            const nameBuffer = Buffer.alloc(32);
            Buffer.from(username).copy(nameBuffer);
            [profilePda] = await PublicKey.findProgramAddress(
              [Buffer.from('username-'), nameBuffer],
              PROGRAM_ID
            );
            break;
          }
        }
      } catch (error) {
        console.error('Error searching for profile:', error);
      }

      if (!profileAccount || !profilePda) {
        alert('Please create a profile first before creating bets.');
        setCreatingBet(false);
        return;
      }

      if (profileAccount.wallet.toString() !== wallet.publicKey.toString()) {
        alert('Profile wallet mismatch. Please contact support.');
        setCreatingBet(false);
        return;
      }
      
      const betIndex = profileAccount.totalMyBetCount as number;
      const betIndexBuffer = Buffer.alloc(4);
      betIndexBuffer.writeUInt32LE(betIndex, 0);
      const [betPda] = await PublicKey.findProgramAddress(
        [Buffer.from('bet'), wallet.publicKey.toBuffer(), betIndexBuffer],
        PROGRAM_ID
      );

      const [treasuryPda] = await PublicKey.findProgramAddress(
        [Buffer.from('bet-treasury-'), betPda.toBuffer()],
        PROGRAM_ID
      );

      let refereePubkey: PublicKey;
      if (refereeType === 0) {
        refereePubkey = wallet.publicKey;
      } else if (refereeType === 2) {
        if (!selectedReferee) {
          alert('Please select a designated referee for Third Party bets.');
          setCreatingBet(false);
          return;
        }
        try {
          refereePubkey = new PublicKey(selectedReferee);
        } catch (error) {
          alert('Invalid referee wallet address.');
          setCreatingBet(false);
          return;
        }
      } else {
        alert('Only Honor System (0) and Third Party (2) referee types are allowed.');
        setCreatingBet(false);
        return;
      }

      const tx = await program.methods
        .createBet(
          betAmountLamports,
          Array.from(descriptionArray),
          refereeType,
          category,
          oddsWinBN,
          oddsLoseBN,
          expiresAtTimestamp
        )
        .accounts({
          creator: wallet.publicKey,
          profile: profilePda,
          referee: refereePubkey,
          bet: betPda,
          treasury: treasuryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await connection.confirmTransaction(tx, 'confirmed');
      window.dispatchEvent(new Event('refreshBalance'));
      
      showNotification('Bet created successfully!', 'success');
      
      // Reset form
      setBetAmount('1');
      setDescription('');
      setRefereeType(0);
      setCategory(1);
      setOddsWin('3');
      setOddsLose('1');
      setExpiresAt('');
      
      // Navigate to my-bets after a short delay
      setTimeout(() => {
        navigate('/my-bets');
      }, 1500);
    } catch (error: any) {
      console.error('Error creating bet:', error);
      const errorMessage = error.message || 'Please try again.';
      showNotification(`Failed to create bet: ${errorMessage}`, 'error');
    } finally {
      setCreatingBet(false);
    }
  };

  const categories = [
    { id: 1, name: 'Personal Growth' },
    { id: 0, name: 'Sports' },
    { id: 3, name: 'Crypto' },
    { id: 9, name: 'Other' }
  ];

  const currentExamples = exampleBets[selectedCategory] || [];

  return (
    <div style={{
      height: '100vh',
      backgroundColor: '#0a0e1a',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Header />
      
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          padding: '16px 24px',
          borderRadius: '8px',
          backgroundColor: notification.type === 'success' ? '#4CAF50' : '#f44336',
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: '600',
          zIndex: 1001,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          animation: 'slideDown 0.3s ease'
        }}>
          {notification.message}
        </div>
      )}

      <div className="make-bet-scroll-container" style={{
        flex: 1,
        padding: '20px',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {/* Category Cards */}
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#ffffff',
            marginBottom: '12px',
            marginTop: 0
          }}>
            Make a Bet
          </h1>
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setCategory(cat.id);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: selectedCategory === cat.id ? '2px solid #ff8c00' : '2px solid #2a2f45',
                  backgroundColor: selectedCategory === cat.id ? '#ff8c00' : '#1a1f35',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== cat.id) {
                    e.currentTarget.style.backgroundColor = '#2a2f45';
                    e.currentTarget.style.borderColor = '#ff8c00';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== cat.id) {
                    e.currentTarget.style.backgroundColor = '#1a1f35';
                    e.currentTarget.style.borderColor = '#2a2f45';
                  }
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestions Section */}
        {!suggestionSelected && (
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '8px',
              marginTop: 0
            }}>
              Suggestions
            </h2>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {currentExamples.map((example, index) => {
                const exampleKey = `${selectedCategory}-${index}`;
                
                return (
                  <div
                    key={exampleKey}
                    onClick={() => handleExampleBetClick(example, exampleKey)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #2a2f45',
                      backgroundColor: '#1a1f35',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
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
                  <div style={{
                    fontSize: '18px',
                    color: '#ffffff',
                    fontStyle: 'italic',
                    lineHeight: '1.4'
                  }}>
                    "{example.description}, with {example.oddsWin}:{example.oddsLose} odds"
                  </div>
                  </div>
                );
              })}
              <div
                onClick={() => {
                  setDescription('');
                  setOddsWin('3');
                  setOddsLose('1');
                  setCategory(selectedCategory);
                  setSuggestionSelected(true);
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px dashed #2a2f45',
                  backgroundColor: '#1a1f35',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
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
                <div style={{
                  fontSize: '14px',
                  color: '#888',
                  fontStyle: 'italic'
                }}>
                  Enter custom bet description
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bet Details Form */}
        {suggestionSelected && (
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #2a2f45',
            backgroundColor: '#1a1f35'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '12px',
              marginTop: 0
            }}>
              Bet Details
            </h2>

          {/* Description */}
          <div style={{ marginBottom: '4px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '6px'
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
                backgroundColor: '#0a0e1a',
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

          {/* Bet Amount, Category, Odds */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '6px',
                flexWrap: 'wrap'
              }}>
                <label style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffffff',
                  margin: 0
                }}>
                  Bet Amount (SOL)
                </label>
                {solPrice !== null && solPrice > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    {[1, 10, 20, 100].map((usdAmount) => (
                      <button
                        key={usdAmount}
                        onClick={() => {
                          const solAmount = usdAmount / solPrice;
                          setBetAmount(solAmount.toFixed(4));
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#ff8c00',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontFamily: 'inherit'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#ff9500';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ff8c00';
                        }}
                      >
                        ${usdAmount}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  style={{
                    flex: '1 1 auto',
                    minWidth: '0',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#0a0e1a',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontFamily: 'inherit'
                  }}
                />
                {solPrice !== null && betAmount && !isNaN(parseFloat(betAmount)) && (
                  <span style={{
                    color: '#888',
                    fontSize: '14px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}>
                    ${(parseFloat(betAmount) * solPrice).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '6px'
              }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const newCategory = parseInt(e.target.value, 10);
                  setCategory(newCategory);
                  setSelectedCategory(newCategory);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #2a2f45',
                  backgroundColor: '#0a0e1a',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <option value={0}>Sports</option>
                <option value={1}>Personal Growth</option>
                <option value={2}>Politics</option>
                <option value={3}>Crypto</option>
                <option value={4}>World Events</option>
                <option value={5}>Entertainment</option>
                <option value={6}>Technology</option>
                <option value={7}>Business</option>
                <option value={8}>Weather</option>
                <option value={9}>Other</option>
              </select>
            </div>
          </div>

          {/* Odds */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '6px'
            }}>
              Bet Odds
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
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
                  backgroundColor: '#0a0e1a',
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
                  backgroundColor: '#0a0e1a',
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
              backgroundColor: '#0a0e1a',
              border: '1px solid #2a2f45'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#888',
                margin: 0,
                lineHeight: '1.6'
              }}>
                If you win you earn <span style={{ color: '#ff8c00', fontWeight: 'bold' }}>{payouts.yourProfit} SOL</span>
                {solPrice !== null && (
                  <span style={{ color: '#888' }}> (${(payouts.yourProfitNum * solPrice).toFixed(2)})</span>
                )}
                , if you lose they earn <span style={{ color: '#ff8c00', fontWeight: 'bold' }}>{payouts.theirWin} SOL</span>
                {solPrice !== null && (
                  <span style={{ color: '#888' }}> (${(payouts.theirWinNum * solPrice).toFixed(2)})</span>
                )}
              </p>
            </div>
          </div>

          {/* Referee Type */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '6px'
              }}>
                Referee Type
              </label>
              <select
                value={refereeType}
                onChange={(e) => {
                  setRefereeType(parseInt(e.target.value, 10));
                  if (parseInt(e.target.value, 10) !== 2) {
                    setSelectedReferee('');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #2a2f45',
                  backgroundColor: '#0a0e1a',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <option value={0}>Honor System</option>
                <option value={2}>Third Party</option>
              </select>
            </div>

            {refereeType === 2 && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '6px'
                }}>
                  Designated Referee
                </label>
                {friends.length === 0 ? (
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#0a0e1a',
                    color: '#888',
                    fontSize: '16px',
                    textAlign: 'center'
                  }}>
                    No friends added
                  </div>
                ) : (
                  <select
                    value={selectedReferee}
                    onChange={(e) => setSelectedReferee(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #2a2f45',
                      backgroundColor: '#0a0e1a',
                      color: '#ffffff',
                      fontSize: '16px',
                      fontFamily: 'inherit',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select a friend...</option>
                    {friends.map((friend, index) => (
                      <option key={index} value={friend.wallet}>{friend.username}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Expires At */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '6px'
            }}>
              Expires At
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '12px'
            }}>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #2a2f45',
                  backgroundColor: '#0a0e1a',
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
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => navigate('/my-bets')}
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
              disabled={creatingBet || !betAmount || !description || !expiresAt || (refereeType === 2 && (friends.length === 0 || !selectedReferee))}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: creatingBet || !betAmount || !description || !expiresAt || (refereeType === 2 && (friends.length === 0 || !selectedReferee)) ? '#666' : '#ff8c00',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: creatingBet || !betAmount || !expiresAt ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                if (!creatingBet && betAmount && description && expiresAt && !(refereeType === 2 && (friends.length === 0 || !selectedReferee))) {
                  e.currentTarget.style.backgroundColor = '#ff9500';
                }
              }}
              onMouseLeave={(e) => {
                if (!creatingBet && betAmount && description && expiresAt && !(refereeType === 2 && (friends.length === 0 || !selectedReferee))) {
                  e.currentTarget.style.backgroundColor = '#ff8c00';
                }
              }}
            >
              {creatingBet ? 'Creating...' : 'Create Bet'}
            </button>
          </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .make-bet-scroll-container::-webkit-scrollbar {
          width: 8px;
        }
        .make-bet-scroll-container::-webkit-scrollbar-track {
          background: #1a1f35;
        }
        .make-bet-scroll-container::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        .make-bet-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
        .make-bet-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: #333 #1a1f35;
        }
      `}</style>
    </div>
  );
};

export default MakeABet;

