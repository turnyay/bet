import React, { useState, useEffect, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import { Header } from '../components/Header';
import { PROGRAM_ID, IDL } from '../lib/bet';

interface BetExample {
  text: string;
  result: 'WIN' | 'FAIL';
  amount: number;
}

const MainPage: React.FC = () => {
  const { connection } = useConnection();
  const betExamples: BetExample[] = [
    { text: 'i bet i can bench 200lbs by december...', result: 'WIN', amount: 8.23 },
    { text: 'i bet the patriots win the superbowl...', result: 'FAIL', amount: -1.9 },
    { text: 'i bet i can finish a marathon...', result: 'WIN', amount: 5.67 },
    { text: 'i bet bitcoin will hit $100k this year...', result: 'WIN', amount: 3.45 },
    { text: 'i bet i can learn spanish in 6 months...', result: 'WIN', amount: 12.34 },
    { text: 'i bet the lakers will win the championship...', result: 'FAIL', amount: -2.1 },
  ];

  const [currentBetIndex, setCurrentBetIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [showAmount, setShowAmount] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [activeBets, setActiveBets] = useState<number>(0);
  const [users, setUsers] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const allTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const currentBet = betExamples[currentBetIndex];
    
    // Clear all previous timeouts
    allTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    allTimeoutsRef.current = [];
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Reset state immediately
    setDisplayedText('');
    setShowResult(false);
    setShowAmount(false);
    setIsTyping(true);
    
    let currentIndex = 0;
    const text = currentBet.text;
    let isActive = true;
    
    const typeChar = () => {
      if (!isActive) return;
      
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        const currentChar = text[currentIndex];
        currentIndex++;
        
        // Add longer pause after spaces (between words)
        let delay = 30 + Math.random() * 20; // Faster: 30-50ms per character
        if (currentChar === ' ') {
          delay += 50 + Math.random() * 30; // Extra 50-80ms pause after words
        }
        
        const timer = setTimeout(typeChar, delay);
        timeoutRef.current = timer;
        allTimeoutsRef.current.push(timer);
      } else {
        // Done typing this statement - wait 1 second before showing result
        setIsTyping(false);
        
        // Wait 1 second, then show result
        const resultTimer = setTimeout(() => {
          if (!isActive) return;
          setShowResult(true);
          
          const amountTimer = setTimeout(() => {
            if (!isActive) return;
            setShowAmount(true);
            
            // Move to next statement after another 1 second pause
            const nextTimer = setTimeout(() => {
              if (!isActive) return;
              setShowAmount(false);
              setShowResult(false);
              setCurrentBetIndex((prev) => (prev + 1) % betExamples.length);
            }, 1000);
            allTimeoutsRef.current.push(nextTimer);
          }, 800);
          allTimeoutsRef.current.push(amountTimer);
        }, 1000);
        allTimeoutsRef.current.push(resultTimer);
      }
    };
    
    const startTimer = setTimeout(() => {
      if (isActive) {
        typeChar();
      }
    }, 100);
    timeoutRef.current = startTimer;
    allTimeoutsRef.current.push(startTimer);
    
    return () => {
      isActive = false;
      allTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      allTimeoutsRef.current = [];
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [currentBetIndex]);

  // Fetch platform stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!connection) {
        setLoadingStats(false);
        return;
      }

      try {
        setLoadingStats(true);
        
        // Create a read-only program instance
        const program = new Program(IDL as Idl, PROGRAM_ID, new AnchorProvider(
          connection,
          {} as any, // Dummy wallet - not needed for read operations
          { commitment: 'confirmed' }
        ));

        // Fetch all profiles and bets in parallel
        const [allProfiles, allBets] = await Promise.all([
          program.account.profile.all(),
          program.account.bet.all()
        ]);

        // Calculate total volume from all profiles
        // Note: Each resolved bet increments both my_bet_volume and accepted_bet_volume by the same amount
        // So we use my_bet_volume to avoid double counting
        let totalVolumeLamports = 0;
        allProfiles.forEach((profile: any) => {
          const myVolume = Number(profile.account.totalMyBetVolume || 0);
          totalVolumeLamports += myVolume;
        });

        // Count active bets (status 0 = Open, 1 = Accepted)
        const activeBetsCount = allBets.filter((bet: any) => {
          const status = bet.account.status;
          return status === 0 || status === 1; // Open or Accepted
        }).length;

        // Count unique users (profiles)
        const uniqueUsers = new Set<string>();
        allProfiles.forEach((profile: any) => {
          uniqueUsers.add(profile.account.wallet.toString());
        });

        setTotalVolume(totalVolumeLamports / 1e9); // Convert to SOL
        setActiveBets(activeBetsCount);
        setUsers(uniqueUsers.size);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [connection]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* Main Content */}
      <div 
        className="bet-scroll-container"
        style={{
          width: '100%',
          height: 'calc(100vh - 64px)',
          backgroundColor: '#0a0e1a',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
        
        {/* Combined Hero and Typing Section */}
        <div style={{
          width: '100%',
          background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f35 20%, #1e3a5f 40%, #2d4a6b 60%, #1a2f4a 80%, #0f1a2e 100%)',
          position: 'relative',
          padding: '80px 40px 60px 40px',
          overflow: 'visible',
          minHeight: '500px'
        }}>
          {/* Animated background elements */}
          <div className="hero-bg-circle" style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 140, 0, 0.1) 0%, transparent 70%)',
            top: '-100px',
            right: '-100px',
            animation: 'pulse 4s ease-in-out infinite',
            pointerEvents: 'none'
          }} />
          <div className="hero-bg-circle" style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(74, 158, 255, 0.1) 0%, transparent 70%)',
            bottom: '-50px',
            left: '-50px',
            animation: 'pulse 5s ease-in-out infinite',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            right: '-10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 140, 0, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30%',
            left: '-5%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(74, 158, 255, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Hero Content */}
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            textAlign: 'center',
            zIndex: 1,
            marginBottom: '60px'
          }}>
            <div style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '20px',
              letterSpacing: '-2px',
              lineHeight: '1.1'
            }}>
              Peer-to-Peer
              <br />
              <span style={{ color: '#ff8c00' }}>Betting</span> on Solana
            </div>
            <p style={{
              fontSize: '20px',
              color: '#888',
              marginBottom: '40px',
              fontWeight: '300'
            }}>
              Decentralized • Transparent • Instant
            </p>
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => window.location.href = '/explore'}
                style={{
                  padding: '16px 32px',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#ffffff',
                  backgroundColor: '#ff8c00',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(255, 140, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff9500';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 140, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff8c00';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 107, 107, 0.3)';
                }}
              >
                Explore Bets
              </button>
            </div>
          </div>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '40px',
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
            zIndex: 1
          }}>
            {/* Bet Text */}
            <div style={{
              fontSize: '24px',
              fontFamily: "'Courier New', monospace",
              color: '#ff8c00',
              textAlign: 'center',
              height: '40px',
              width: '100%',
              maxWidth: '1000px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              letterSpacing: '0.3px',
              textTransform: 'lowercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '40px'
            }}>
              {displayedText}
              {isTyping && (
                <span style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '24px',
                  backgroundColor: '#ff8c00',
                  marginLeft: '4px',
                  animation: 'blink 1s infinite',
                  verticalAlign: 'middle'
                }} />
              )}
              {showResult && (
                <span style={{
                  marginLeft: '15px',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: betExamples[currentBetIndex].result === 'WIN' ? '#22c55e' : '#ef4444',
                  textTransform: 'uppercase'
                }}>
                  {betExamples[currentBetIndex].result}
                </span>
              )}
              {showAmount && (
                <span style={{
                  marginLeft: '10px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: betExamples[currentBetIndex].amount >= 0 ? '#22c55e' : '#ef4444'
                }}>
                  {betExamples[currentBetIndex].amount >= 0 ? '+' : ''}{betExamples[currentBetIndex].amount.toFixed(2)} SOL
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div style={{
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
          padding: '80px 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {/* Feature Card 1 */}
          <div style={{
            backgroundColor: 'rgb(10, 14, 26)',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #1a1f2e',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#ff8c00';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 140, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#1a1f2e';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.backgroundColor = 'rgb(10, 14, 26)';
          }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ff8c00 0%, #ff9500 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '12px'
            }}>
              P2P Betting
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#888',
              lineHeight: '1.6',
              margin: 0
            }}>
              Bet directly with other users. No intermediaries.
            </p>
          </div>

          {/* Feature Card 2 */}
          <div style={{
            backgroundColor: 'rgb(10, 14, 26)',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #1a1f2e',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#ff8c00';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 140, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#1a1f2e';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.backgroundColor = 'rgb(10, 14, 26)';
          }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4a9eff 0%, #1e5cb3 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V12L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '12px'
            }}>
              On-Chain
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#888',
              lineHeight: '1.6',
              margin: 0
            }}>
              All bets recorded on Solana blockchain.
            </p>
          </div>

          {/* Feature Card 3 */}
          <div style={{
            backgroundColor: 'rgb(10, 14, 26)',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #1a1f2e',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#ff8c00';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 140, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#1a1f2e';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.backgroundColor = 'rgb(10, 14, 26)';
          }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #00d4aa 0%, #00a67e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '12px'
            }}>
              Instant
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#888',
              lineHeight: '1.6',
              margin: 0
            }}>
              Fast settlement with minimal fees.
            </p>
          </div>

          {/* Feature Card 4 */}
          <div style={{
            backgroundColor: 'rgb(10, 14, 26)',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #1a1f2e',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#ff8c00';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 140, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#1a1f2e';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.backgroundColor = 'rgb(10, 14, 26)';
          }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ffd700 0%, #ffb300 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.40002 12C3.40002 16 6.00002 19 10 20C14 21 18 19.5 20.5 16.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21.6 12C20.6 8 18 5 14 4C10 3 6 4.5 3.5 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '12px'
            }}>
              Secure
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#888',
              lineHeight: '1.6',
              margin: 0
            }}>
              Smart contracts ensure fair payouts.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div style={{
          width: '100%',
          backgroundColor: 'rgb(10, 14, 26)',
          padding: '60px 40px',
          borderTop: '1px solid #1a1f2e',
          borderBottom: '1px solid #1a1f2e'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '40px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#ff8c00',
                marginBottom: '8px'
              }}>
                {loadingStats ? '...' : totalVolume.toFixed(2)}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Total Volume (SOL)
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#ff8c00',
                marginBottom: '8px'
              }}>
                {loadingStats ? '...' : activeBets}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Active Bets
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#ff8c00',
                marginBottom: '8px'
              }}>
                {loadingStats ? '...' : users}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Users
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .bet-scroll-container::-webkit-scrollbar {
          width: 8px;
        }
        .bet-scroll-container::-webkit-scrollbar-track {
          background: #0a0e1a;
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
          scrollbar-color: #333 #0a0e1a;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }
        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }
        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes flash {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
        .hero-bg-circle {
          animation: pulse 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default MainPage;
