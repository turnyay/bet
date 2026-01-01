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

  // Fetch SOL balance when wallet is connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (wallet.publicKey && connection) {
        try {
          const balance = await connection.getBalance(wallet.publicKey);
          setBalance(balance / 1e9); // Convert lamports to SOL
        } catch (err) {
          console.error('Error fetching balance:', err);
          setBalance(null);
        }
      } else {
        setBalance(null);
      }
    };

    fetchBalance();
    // Refresh balance every 5 seconds
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [wallet.publicKey, connection]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ height: '64px', backgroundColor: '#050d1a', borderBottom: '1px solid #0a1a2e' }}>
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        {/* Left section - Logo and BET text */}
        <div
          onClick={() => navigate('/')}
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
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
          {/* BET Logo - Simple betting chip/dice design */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 200 200"
            style={{ height: '36px', width: 'auto', flexShrink: 0 }}
          >
            <defs>
              <linearGradient id="betGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6b6b"/>
                <stop offset="100%" stopColor="#c92a2a"/>
              </linearGradient>
            </defs>
            {/* Betting chip/dice shape */}
            <circle cx="100" cy="100" r="80" fill="url(#betGradient)" stroke="#ffffff" strokeWidth="4"/>
            <text x="100" y="120" fontSize="60" fill="#ffffff" textAnchor="middle" fontWeight="bold" fontFamily="Arial, sans-serif">B</text>
          </svg>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
            BET
          </h1>
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
                backgroundColor: isActive('/explore') ? '#ff6b6b' : 'transparent',
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
              onClick={() => navigate('/my-bets')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive('/my-bets') ? '#ff6b6b' : 'transparent',
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
                backgroundColor: isActive('/profile') ? '#ff6b6b' : 'transparent',
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

          {wallet.connected && balance !== null && (
            <span style={{ color: '#ffffff', fontSize: '14px' }}>
              {balance.toFixed(4)} SOL
            </span>
          )}
          
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

