import React from 'react';
import { Header } from '../components/Header';

const MyBets: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* Main Content */}
      <div style={{
        flex: 1,
        padding: '60px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a2332'
      }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: '20px'
        }}>
          My Bets
        </h2>
        <p style={{
          fontSize: '18px',
          color: '#cccccc'
        }}>
          This page is coming soon...
        </p>
      </div>
    </div>
  );
};

export default MyBets;

