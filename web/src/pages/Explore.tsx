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
  const placeholderBets: Bet[] = [
    {
      id: '1',
      creator: 'Mike',
      description: 'he will go to the gym every day for 7 days',
      category: 'Personal Growth',
      amount: 100,
      ratio: '100:1',
      payout: 'Mike gets $1 if completed'
    },
    {
      id: '2',
      creator: 'Mike',
      description: 'there will be a major earthquake in California this month',
      category: 'World Events',
      amount: 1,
      ratio: '1:10000',
      payout: 'Mike gets $10,000 if it happens'
    },
    {
      id: '3',
      creator: 'Mike',
      description: 'an asteroid will hit Earth in the next year',
      category: 'World Events',
      amount: 1,
      ratio: '1:10000',
      payout: 'Mike gets $10,000 if it happens'
    },
    {
      id: '4',
      creator: 'Alice',
      description: 'the Lakers will win the NBA championship',
      category: 'Sports',
      amount: 500,
      ratio: '2:1',
      payout: 'Alice gets $250 if they win'
    },
    {
      id: '5',
      creator: 'Bob',
      description: 'Bitcoin will reach $100k by end of year',
      category: 'Crypto',
      amount: 200,
      ratio: '5:1',
      payout: 'Bob gets $40 if it happens'
    },
    {
      id: '6',
      creator: 'Mike',
      description: 'there will be a zombie apocalypse',
      category: 'World Events',
      amount: 1,
      ratio: '1:10000',
      payout: 'Mike gets $10,000 if it happens'
    },
    {
      id: '7',
      creator: 'Sarah',
      description: 'it will rain in Los Angeles next week',
      category: 'Weather',
      amount: 150,
      ratio: '3:1',
      payout: 'Sarah gets $50 if it rains'
    },
    {
      id: '8',
      creator: 'John',
      description: 'the next US election will have record voter turnout',
      category: 'Politics',
      amount: 300,
      ratio: '4:1',
      payout: 'John gets $75 if it happens'
    },
    {
      id: '9',
      creator: 'Mike',
      description: 'aliens will make first contact with Earth',
      category: 'World Events',
      amount: 1,
      ratio: '1:10000',
      payout: 'Mike gets $10,000 if it happens'
    },
    {
      id: '10',
      creator: 'Emma',
      description: 'she will read 10 books this month',
      category: 'Personal Growth',
      amount: 75,
      ratio: '20:1',
      payout: 'Emma gets $3.75 if completed'
    },
    {
      id: '11',
      creator: 'David',
      description: 'the Chiefs will win the Super Bowl',
      category: 'Sports',
      amount: 400,
      ratio: '3:1',
      payout: 'David gets $133.33 if they win'
    },
    {
      id: '12',
      creator: 'Lisa',
      description: 'Ethereum will hit $5k by December',
      category: 'Crypto',
      amount: 250,
      ratio: '8:1',
      payout: 'Lisa gets $31.25 if it happens'
    },
    {
      id: '13',
      creator: 'Tom',
      description: 'it will snow in Miami this winter',
      category: 'Weather',
      amount: 50,
      ratio: '50:1',
      payout: 'Tom gets $1 if it snows'
    },
    {
      id: '14',
      creator: 'Rachel',
      description: 'the new iPhone will have a foldable screen',
      category: 'Technology',
      amount: 180,
      ratio: '6:1',
      payout: 'Rachel gets $30 if it happens'
    },
    {
      id: '15',
      creator: 'Chris',
      description: 'Tesla stock will reach $500 by year end',
      category: 'Business',
      amount: 350,
      ratio: '4:1',
      payout: 'Chris gets $87.50 if it happens'
    },
    {
      id: '16',
      creator: 'Mike',
      description: 'a volcano will erupt in Yellowstone',
      category: 'World Events',
      amount: 1,
      ratio: '1:10000',
      payout: 'Mike gets $10,000 if it happens'
    },
    {
      id: '17',
      creator: 'Jessica',
      description: 'she will meditate every day for 30 days',
      category: 'Personal Growth',
      amount: 120,
      ratio: '15:1',
      payout: 'Jessica gets $8 if completed'
    },
    {
      id: '18',
      creator: 'Alex',
      description: 'the next Marvel movie will gross over $1B',
      category: 'Entertainment',
      amount: 220,
      ratio: '2:1',
      payout: 'Alex gets $110 if it happens'
    },
    {
      id: '19',
      creator: 'Sam',
      description: 'there will be a major tech company IPO this quarter',
      category: 'Business',
      amount: 280,
      ratio: '5:1',
      payout: 'Sam gets $56 if it happens'
    },
    {
      id: '20',
      creator: 'Mike',
      description: 'time travel will be discovered',
      category: 'Technology',
      amount: 1,
      ratio: '1:10000',
      payout: 'Mike gets $10,000 if it happens'
    },
    {
      id: '21',
      creator: 'Maria',
      description: 'she will learn Spanish fluently in 6 months',
      category: 'Personal Growth',
      amount: 200,
      ratio: '10:1',
      payout: 'Maria gets $20 if completed'
    },
    {
      id: '22',
      creator: 'Kevin',
      description: 'the Warriors will make the playoffs',
      category: 'Sports',
      amount: 600,
      ratio: '1.5:1',
      payout: 'Kevin gets $400 if they make it'
    },
    {
      id: '23',
      creator: 'Nina',
      description: 'Solana will reach $200 by end of year',
      category: 'Crypto',
      amount: 150,
      ratio: '12:1',
      payout: 'Nina gets $12.50 if it happens'
    },
    {
      id: '24',
      creator: 'Mike',
      description: 'the sun will explode',
      category: 'World Events',
      amount: 1,
      ratio: '1:10000',
      payout: 'Mike gets $10,000 if it happens'
    },
    {
      id: '25',
      creator: 'Ryan',
      description: 'it will be the hottest summer on record',
      category: 'Weather',
      amount: 100,
      ratio: '7:1',
      payout: 'Ryan gets $14.29 if it happens'
    },
    {
      id: '26',
      creator: 'Sophia',
      description: 'she will run a marathon this year',
      category: 'Personal Growth',
      amount: 300,
      ratio: '5:1',
      payout: 'Sophia gets $60 if completed'
    },
    {
      id: '27',
      creator: 'Mike',
      description: 'robots will take over the world',
      category: 'Technology',
      amount: 1,
      ratio: '1:10000',
      payout: 'Mike gets $10,000 if it happens'
    },
    {
      id: '28',
      creator: 'Daniel',
      description: 'the next Star Wars movie will be rated R',
      category: 'Entertainment',
      amount: 175,
      ratio: '9:1',
      payout: 'Daniel gets $19.44 if it happens'
    }
  ];

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
