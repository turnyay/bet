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
          backgroundColor: '#0a0e1a',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
        
        {/* Hero Section */}
        <div style={{
          width: '100%',
          minHeight: '500px',
          background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '80px 40px',
          overflow: 'hidden'
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
            animation: 'pulse 4s ease-in-out infinite'
          }} />
          <div className="hero-bg-circle" style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(74, 158, 255, 0.1) 0%, transparent 70%)',
            bottom: '-50px',
            left: '-50px',
            animation: 'pulse 5s ease-in-out infinite'
          }} />

          <div style={{
            maxWidth: '800px',
            textAlign: 'center',
            zIndex: 1
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
            backgroundColor: '#0f1419',
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
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 140, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#1a1f2e';
            e.currentTarget.style.boxShadow = 'none';
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
            backgroundColor: '#0f1419',
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
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 140, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#1a1f2e';
            e.currentTarget.style.boxShadow = 'none';
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
            backgroundColor: '#0f1419',
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
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 140, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#1a1f2e';
            e.currentTarget.style.boxShadow = 'none';
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
            backgroundColor: '#0f1419',
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
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 140, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#1a1f2e';
            e.currentTarget.style.boxShadow = 'none';
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
          backgroundColor: '#0f1419',
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
                —
              </div>
              <div style={{
                fontSize: '14px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Total Volume
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#ff8c00',
                marginBottom: '8px'
              }}>
                —
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
                —
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
        .hero-bg-circle {
          animation: pulse 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default MainPage;
