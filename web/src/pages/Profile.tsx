import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Header } from '../components/Header';

const Profile: React.FC = () => {
  const { publicKey } = useWallet();
  const [friends, setFriends] = useState<string[]>([]);
  const [showAddFriend, setShowAddFriend] = useState<boolean>(false);
  const [friendAddress, setFriendAddress] = useState<string>('');

  const walletAddress = publicKey ? publicKey.toString() : 'Not connected';
  const displayAddress = publicKey 
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : walletAddress;

  const handleAddFriend = () => {
    if (friendAddress.trim()) {
      setFriends([...friends, friendAddress.trim()]);
      setFriendAddress('');
      setShowAddFriend(false);
    }
  };

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
        
        <div style={{
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          paddingTop: '20px'
        }}>
          {/* Banner Image */}
          <div style={{
            width: '100%',
            height: '120px',
            backgroundColor: '#0a0e1a',
            borderRadius: '16px 16px 0 0',
            border: '1px solid #2a2f45',
            borderBottom: 'none',
            position: 'relative',
            overflow: 'hidden',
            marginTop: '10px'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #ff8c00 0%, #ff6b00 50%, #0a0e1a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="100" height="100" viewBox="0 0 200 200" style={{ opacity: 0.2 }}>
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ffffff" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
          </div>

          {/* Profile Header Card */}
          <div style={{
            backgroundColor: '#0a0e1a',
            borderRadius: '0 0 16px 16px',
            padding: '32px',
            paddingTop: '70px',
            border: '1px solid #2a2f45',
            borderTop: 'none',
            marginTop: '-60px',
            position: 'relative'
          }}>
            {/* Profile Picture */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              left: '32px',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: '4px solid #0a0e1a',
              backgroundColor: '#1a1f35',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #4a9eff 0%, #1e5cb3 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                color: '#ffffff',
                fontWeight: 'bold'
              }}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* User Info */}
            <div style={{
              marginBottom: '32px'
            }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: '8px'
              }}>
                Username
              </h2>
              <p style={{
                fontSize: '16px',
                color: '#888',
                margin: 0
              }}>
                {displayAddress}
              </p>
            </div>

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px'
            }}>
              <div style={{
                padding: '20px',
                backgroundColor: '#1a1f35',
                borderRadius: '12px',
                border: '1px solid #2a2f45'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Total Bets Placed
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#ffffff'
                }}>
                  —
                </div>
              </div>

              <div style={{
                padding: '20px',
                backgroundColor: '#1a1f35',
                borderRadius: '12px',
                border: '1px solid #2a2f45'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Bets Won
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#00d4aa'
                }}>
                  —
                </div>
              </div>

              <div style={{
                padding: '20px',
                backgroundColor: '#1a1f35',
                borderRadius: '12px',
                border: '1px solid #2a2f45'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Bets Lost
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#ff6b6b'
                }}>
                  —
                </div>
              </div>

              <div style={{
                padding: '20px',
                backgroundColor: '#1a1f35',
                borderRadius: '12px',
                border: '1px solid #2a2f45'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Total Profit/Loss
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#ff8c00'
                }}>
                  $—
                </div>
              </div>

              <div style={{
                padding: '20px',
                backgroundColor: '#1a1f35',
                borderRadius: '12px',
                border: '1px solid #2a2f45'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Win Rate
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#ffffff'
                }}>
                  —%
                </div>
              </div>

              <div style={{
                padding: '20px',
                backgroundColor: '#1a1f35',
                borderRadius: '12px',
                border: '1px solid #2a2f45'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Total Volume
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#ffffff'
                }}>
                  $—
                </div>
              </div>
            </div>
          </div>

          {/* Friends Section */}
          <div style={{
            backgroundColor: '#0a0e1a',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #2a2f45',
            marginBottom: '40px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#ffffff',
                margin: 0
              }}>
                Friends
              </h3>
              <button
                onClick={() => setShowAddFriend(!showAddFriend)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ff8c00',
                  color: '#ffffff',
                  fontSize: '16px',
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
                Add Friend
              </button>
            </div>

            {/* Add Friend Input */}
            {showAddFriend && (
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#1a1f35',
                borderRadius: '8px',
                border: '1px solid #2a2f45'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <input
                    type="text"
                    value={friendAddress}
                    onChange={(e) => setFriendAddress(e.target.value)}
                    placeholder="Enter wallet address or username"
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #2a2f45',
                      backgroundColor: '#0a0e1a',
                      color: '#ffffff',
                      fontSize: '16px',
                      fontFamily: 'inherit'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddFriend();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddFriend}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#ff8c00',
                      color: '#ffffff',
                      fontSize: '16px',
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
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddFriend(false);
                      setFriendAddress('');
                    }}
                    style={{
                      padding: '10px 20px',
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
                </div>
              </div>
            )}

            {/* Friends List */}
            {friends.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#888'
              }}>
                <p style={{
                  fontSize: '16px',
                  margin: 0
                }}>
                  No friends yet. Add your first friend above!
                </p>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {friends.map((friend, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      backgroundColor: '#1a1f35',
                      borderRadius: '8px',
                      border: '1px solid #2a2f45',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{
                      fontSize: '16px',
                      color: '#ffffff'
                    }}>
                      {friend}
                    </span>
                    <button
                      onClick={() => {
                        setFriends(friends.filter((_, i) => i !== index));
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #2a2f45',
                        backgroundColor: 'transparent',
                        color: '#888',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2a2f45';
                        e.currentTarget.style.color = '#ff6b6b';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#888';
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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

export default Profile;
