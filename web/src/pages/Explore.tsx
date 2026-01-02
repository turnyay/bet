import React, { useState } from 'react';
import { Header } from '../components/Header';

interface Bet {
  id: string;
  creator: string;
  description: string;
  category: string;
  amount: number;
  ratio: string;
  payout: string;
}

const Explore: React.FC = () => {
  const categories = [
    'All',
    'Sports',
    'Personal Growth',
    'Politics',
    'Crypto',
    'World Events',
    'Entertainment',
    'Technology',
    'Business',
    'Weather',
    'Other'
  ];

  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Placeholder bets
  const placeholderBets: Bet[] = [];

  const filteredBets = selectedCategory === 'All' 
    ? placeholderBets 
    : placeholderBets.filter(bet => bet.category === selectedCategory);

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
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
        
        {/* Category Banner */}
        <div style={{
          width: '100%',
          backgroundColor: '#1a1f35',
          borderBottom: '1px solid #2a2f45',
          padding: '20px 40px',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '8px'
          }}>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: selectedCategory === category ? '#ff8c00' : '#1a1f2e',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: selectedCategory === category ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== category) {
                    e.currentTarget.style.backgroundColor = '#2a2f3e';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== category) {
                    e.currentTarget.style.backgroundColor = '#1a1f2e';
                  }
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Current Bets Section */}
        <div style={{
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
          padding: '40px'
        }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#ffffff',
            marginBottom: '32px'
          }}>
            Current Bets
          </h2>

          {filteredBets.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#888'
            }}>
              <p style={{ fontSize: '18px' }}>No bets found in this category</p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {filteredBets.map((bet) => (
                <div
                  key={bet.id}
                  style={{
                  backgroundColor: '#0a0e1a',
                  borderRadius: '12px',
                  padding: '24px',
                  border: '1px solid #2a2f45',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ff8c00';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2a2f45';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '24px',
                    flexWrap: 'wrap'
                  }}>
                    {/* Left side - Bet description */}
                    <div style={{ flex: 1, minWidth: '300px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#ffffff'
                        }}>
                          {bet.creator}
                        </span>
                        <span style={{
                          fontSize: '18px',
                          color: '#888'
                        }}>
                          bets ${bet.amount}
                        </span>
                        <span style={{
                          fontSize: '18px',
                          color: '#ffffff'
                        }}>
                          {bet.description}
                        </span>
                      </div>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#2a2f45',
                        border: '1px solid #3a3f55'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: '#ff8c00',
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {bet.category}
                        </span>
                      </div>
                    </div>

                    {/* Right side - Bet ratio */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '4px'
                    }}>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#ff8c00'
                      }}>
                        {bet.ratio}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#888'
                      }}>
                        {bet.payout}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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

export default Explore;
