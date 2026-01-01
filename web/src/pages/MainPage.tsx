import React from 'react';
import { Header } from '../components/Header';

const MainPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* Main Content */}
      <div 
        className="bet-scroll-container"
        style={{
          width: '100%',
          height: 'calc(100vh - 64px)',
          backgroundColor: '#1a2332',
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
        <div style={{
          maxWidth: '1200px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '40px'
        }}>
          {/* Hero Section */}
          <div style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}>
            <h1 style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '20px'
            }}>
              Welcome to <span style={{ color: '#ff6b6b' }}>BET</span>
            </h1>
            <p style={{
              fontSize: '24px',
              color: '#cccccc',
              marginBottom: '40px'
            }}>
              A Solana-Based Peer-to-Peer Betting Platform
            </p>
          </div>

          {/* About Section */}
          <div style={{
            backgroundColor: '#050d1a',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #0a1a2e'
          }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '20px'
            }}>
              About BET
            </h2>
            <p style={{
              fontSize: '18px',
              color: '#cccccc',
              lineHeight: '1.8',
              marginBottom: '20px'
            }}>
              BET is a decentralized peer-to-peer betting platform built on the Solana blockchain. 
              Create custom bets, challenge other users, and settle wagers automatically using smart contracts. 
              All transactions are transparent, secure, and executed on-chain.
            </p>
            <p style={{
              fontSize: '18px',
              color: '#cccccc',
              lineHeight: '1.8',
              marginBottom: '20px'
            }}>
              Whether you're betting on sports, events, or custom challenges, BET provides a trustless 
              environment where funds are held in escrow and automatically distributed to winners based 
              on verifiable outcomes.
            </p>
            <p style={{
              fontSize: '18px',
              color: '#cccccc',
              lineHeight: '1.8',
              margin: 0
            }}>
              Built on Solana for fast, low-cost transactions, BET brings the power of decentralized 
              betting to everyone.
            </p>
          </div>

          {/* Features Section */}
          <div>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '30px',
              textAlign: 'center'
            }}>
              Key Features
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              <div style={{
                backgroundColor: '#050d1a',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #0a1a2e'
              }}>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#ff6b6b',
                  marginBottom: '12px'
                }}>
                  Peer-to-Peer
                </h3>
                <p style={{
                  fontSize: '16px',
                  color: '#cccccc',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  Bet directly with other users without intermediaries. All funds are held in secure 
                  smart contract escrow until the bet is resolved.
                </p>
              </div>

              <div style={{
                backgroundColor: '#050d1a',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #0a1a2e'
              }}>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#ff6b6b',
                  marginBottom: '12px'
                }}>
                  Transparent & Secure
                </h3>
                <p style={{
                  fontSize: '16px',
                  color: '#cccccc',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  All bets and outcomes are recorded on the Solana blockchain, providing complete 
                  transparency and immutability. Smart contracts ensure fair and automatic payouts.
                </p>
              </div>

              <div style={{
                backgroundColor: '#050d1a',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #0a1a2e'
              }}>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#ff6b6b',
                  marginBottom: '12px'
                }}>
                  Fast & Low Cost
                </h3>
                <p style={{
                  fontSize: '16px',
                  color: '#cccccc',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  Built on Solana for near-instant transaction finality and minimal fees. Create and 
                  settle bets without worrying about high gas costs.
                </p>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '30px',
              textAlign: 'center'
            }}>
              How It Works
            </h2>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#ff6b6b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  1
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginBottom: '8px'
                  }}>
                    Create or Explore Bets
                  </h3>
                  <p style={{
                    fontSize: '18px',
                    color: '#cccccc',
                    lineHeight: '1.8',
                    margin: 0
                  }}>
                    Browse available bets created by other users or create your own custom bet with 
                    specific terms and conditions.
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#ff6b6b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  2
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginBottom: '8px'
                  }}>
                    Place Your Wager
                  </h3>
                  <p style={{
                    fontSize: '18px',
                    color: '#cccccc',
                    lineHeight: '1.8',
                    margin: 0
                  }}>
                    Connect your Solana wallet and deposit your bet amount. Funds are locked in a 
                    smart contract escrow until the bet is resolved.
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#ff6b6b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  3
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginBottom: '8px'
                  }}>
                    Automatic Settlement
                  </h3>
                  <p style={{
                    fontSize: '18px',
                    color: '#cccccc',
                    lineHeight: '1.8',
                    margin: 0
                  }}>
                    Once the outcome is determined, the smart contract automatically distributes the 
                    winnings to the correct party. No disputes, no delays.
                  </p>
                </div>
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
          background: #1a2332;
        }
        .bet-scroll-container::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 4px;
        }
        .bet-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        /* Firefox */
        .bet-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: #444 #1a2332;
        }
      `}</style>
    </div>
  );
};

export default MainPage;

