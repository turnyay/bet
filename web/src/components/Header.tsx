import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useNetwork } from '../contexts/NetworkContext';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { connection } = useConnection();
  const wallet = useWallet();
  const { network, setNetwork } = useNetwork();
  const [balance, setBalance] = useState<number | null>(null);
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

    fetchSolPrice();
    // Refresh price every 60 seconds
    const priceInterval = setInterval(fetchSolPrice, 60000);
    
    return () => {
      clearInterval(priceInterval);
    };
  }, []);

  // Fetch SOL balance when wallet is connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (wallet.publicKey && connection) {
        try {
          const balance = await connection.getBalance(wallet.publicKey);
          const newBalance = balance / 1e9; // Convert lamports to SOL
          // Only update if balance actually changed to prevent unnecessary re-renders
          setBalance(prev => {
            if (prev !== null && Math.abs(prev - newBalance) < 0.0001) {
              return prev; // Return previous value if change is negligible
            }
            return newBalance;
          });
        } catch (err) {
          console.error('Error fetching balance:', err);
          setBalance(null);
        }
      } else {
        setBalance(null);
      }
    };

    fetchBalance();
    // Refresh balance every 30 seconds (reduced frequency to prevent flashing)
    const interval = setInterval(fetchBalance, 30000);
    
    // Listen for custom balance refresh events
    const handleBalanceRefresh = () => {
      fetchBalance();
    };
    window.addEventListener('refreshBalance', handleBalanceRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshBalance', handleBalanceRefresh);
    };
  }, [wallet.publicKey, connection]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ height: '64px', backgroundColor: '#050d1a', borderBottom: '1px solid #0a1a2e' }}>
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        {/* Left section - Bet67 text logo */}
        <div
          onClick={() => navigate('/')}
          className="bet67-logo-container"
          style={{ 
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'opacity 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: '700', 
            color: '#ffffff', 
            margin: 0,
            fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
            letterSpacing: '2px',
            display: 'flex',
            alignItems: 'baseline',
            gap: '2px',
            lineHeight: '1'
          }}>
            <span style={{ 
              textTransform: 'uppercase',
              fontSize: '42px',
              lineHeight: '1',
              display: 'inline-block'
            }}>B</span>
            <span style={{ 
              textTransform: 'uppercase',
              fontSize: '42px',
              lineHeight: '1',
              display: 'inline-block'
            }}>e</span>
            <span style={{ 
              textTransform: 'uppercase',
              fontSize: '42px',
              lineHeight: '1',
              display: 'inline-block'
            }}>t</span>
            <span 
              className="bet67-number-6"
              style={{
                fontSize: '42px',
                fontWeight: '900',
                color: '#ff8c00',
                fontFamily: "'Tourney', sans-serif",
                letterSpacing: '2px',
                lineHeight: '1',
                display: 'inline-block'
              }}
            >
              6
            </span>
            <span 
              className="bet67-number-7"
              style={{
                fontSize: '42px',
                fontWeight: '900',
                color: '#ff8c00',
                fontFamily: "'Tourney', sans-serif",
                letterSpacing: '2px',
                lineHeight: '1',
                display: 'inline-block'
              }}
            >
              7
            </span>
          </h1>
          <style>{`
            .bet67-logo-container:hover .bet67-number-6 {
              animation: moveUpDown6 0.8s ease-in-out;
            }
            .bet67-logo-container:hover .bet67-number-7 {
              animation: moveUpDown7 0.8s ease-in-out;
            }
            @keyframes moveUpDown6 {
              0% {
                transform: translateY(0);
              }
              25% {
                transform: translateY(-8px);
              }
              50% {
                transform: translateY(0);
              }
              100% {
                transform: translateY(0);
              }
            }
            @keyframes moveUpDown7 {
              0% {
                transform: translateY(0);
              }
              50% {
                transform: translateY(0);
              }
              75% {
                transform: translateY(-8px);
              }
              100% {
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
        
        {/* Right section - Navigation tabs, Wallet, Balance, Network */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginRight: '16px' }}>
            <button
              onClick={() => navigate('/explore')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive('/explore') ? '#ff8c00' : 'transparent',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: isActive('/explore') ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/explore')) {
                  e.currentTarget.style.backgroundColor = '#333';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/explore')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              Explore
            </button>
            <button
              onClick={() => navigate('/make-a-bet')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive('/make-a-bet') ? '#ff8c00' : 'transparent',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: isActive('/make-a-bet') ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/make-a-bet')) {
                  e.currentTarget.style.backgroundColor = '#333';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/make-a-bet')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              Make a Bet
            </button>
            <button
              onClick={() => navigate('/my-bets')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive('/my-bets') ? '#ff8c00' : 'transparent',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: isActive('/my-bets') ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/my-bets')) {
                  e.currentTarget.style.backgroundColor = '#333';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/my-bets')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              My Bets
            </button>
            <button
              onClick={() => navigate('/profile')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive('/profile') ? '#ff8c00' : 'transparent',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: isActive('/profile') ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/profile')) {
                  e.currentTarget.style.backgroundColor = '#333';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/profile')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              Profile
            </button>
          </div>

          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            minWidth: '70px'
          }}>
            <span style={{ 
              color: '#ffffff', 
              fontSize: '14px',
              textAlign: 'right',
              display: 'inline-block'
            }}>
              {wallet.connected && balance !== null ? `${balance.toFixed(4)} SOL` : '\u00A0'}
            </span>
            {wallet.connected && balance !== null && solPrice !== null && (
              <span style={{ 
                color: '#888', 
                fontSize: '12px',
                textAlign: 'right',
                display: 'inline-block'
              }}>
                ${(balance * solPrice).toFixed(2)}
              </span>
            )}
          </div>
          
          {/* Network Dropdown */}
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as 'localnet' | 'devnet' | 'mainnet')}
            style={{
              padding: '6px 12px',
              backgroundColor: '#1a1a1a',
              border: '1px solid #555',
              borderRadius: '4px',
              color: '#ffffff',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#777';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#555';
            }}
          >
            <option value="localnet">Localnet</option>
            <option value="devnet">Devnet</option>
            <option value="mainnet">Mainnet</option>
          </select>
          
          <WalletMultiButton />
        </div>
      </div>
    </div>
  );
};

