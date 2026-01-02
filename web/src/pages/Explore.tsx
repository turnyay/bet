import React, { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import { Header } from '../components/Header';
import { PROGRAM_ID, IDL } from '../lib/bet';

interface Bet {
  id: string;
  publicKey: PublicKey;
  creator: string;
  description: string;
  category: string;
  amount: number;
  ratio: string;
  payout: string;
  status: number;
  expiresAt: number;
}

const Explore: React.FC = () => {
  const { connection } = useConnection();
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
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchBets();
  }, [connection]);

  const fetchBets = async () => {
    if (!connection) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Create a read-only program instance
      const program = new Program(IDL as Idl, PROGRAM_ID, new AnchorProvider(
        connection,
        {} as any, // Dummy wallet - not needed for read operations
        { commitment: 'confirmed' }
      ));

      // Fetch all bet accounts
      const allBets = await program.account.bet.all();
      
      const betList: Bet[] = allBets
        .map((bet: any) => {
          const betAccount = bet.account;
          const descriptionBytes = betAccount.description as number[] | undefined;
          const description = descriptionBytes 
            ? Buffer.from(descriptionBytes)
                .toString('utf8')
                .replace(/\0/g, '')
                .trim() || 'No description'
            : 'No description';
          
          const creatorPubkey = betAccount.creator as PublicKey;
          const creatorShort = `${creatorPubkey.toBase58().slice(0, 4)}...${creatorPubkey.toBase58().slice(-4)}`;
          
          const amount = Number(betAccount.betAmount) / 1e9; // Convert lamports to SOL
          const oddsWin = Number(betAccount.oddsWin);
          const oddsLose = Number(betAccount.oddsLose);
          const ratio = `${oddsWin} : ${oddsLose}`;
          const profit = (amount * oddsWin / oddsLose).toFixed(2);
          const payout = `${creatorShort} gets $${profit} if completed`;
          
          // For now, default to "Other" category since we don't store category in the bet account yet
          // TODO: Add category field to Bet account
          const category = 'Other';
          
          return {
            id: bet.publicKey.toBase58(),
            publicKey: bet.publicKey,
            creator: creatorShort,
            description,
            category,
            amount,
            ratio,
            payout,
            status: betAccount.status,
            expiresAt: Number(betAccount.expiresAt)
          };
        });
      
      setBets(betList);
    } catch (error) {
      console.error('Error fetching bets:', error);
      setBets([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBets = selectedCategory === 'All' 
    ? bets 
    : bets.filter(bet => bet.category === selectedCategory);

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

          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#888'
            }}>
              <p style={{ fontSize: '18px' }}>Loading bets...</p>
            </div>
          ) : filteredBets.length === 0 ? (
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
