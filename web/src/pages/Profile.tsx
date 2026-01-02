import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import { Header } from '../components/Header';
import { PROGRAM_ID, IDL, BetClient } from '../lib/bet';

const Profile: React.FC = () => {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const { connection } = useConnection();
  const [friends, setFriends] = useState<string[]>([]);
  const [showAddFriend, setShowAddFriend] = useState<boolean>(false);
  const [friendAddress, setFriendAddress] = useState<string>('');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateProfile, setShowCreateProfile] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [creatingProfile, setCreatingProfile] = useState<boolean>(false);

  const walletAddress = publicKey ? publicKey.toString() : 'Not connected';
  const displayAddress = publicKey 
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : walletAddress;

  useEffect(() => {
    if (publicKey && connection) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [publicKey, connection]);

  const fetchProfile = async () => {
    if (!publicKey || !connection) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Use BetClient which has the properly processed IDL
      const client = new BetClient(wallet, connection);
      const program = client.getProgram();

      // Find profile PDA
      const [profilePda] = await PublicKey.findProgramAddress(
        [Buffer.from('profile-'), publicKey.toBuffer()],
        PROGRAM_ID
      );

      try {
        // Anchor converts account names to camelCase, so "Profile" becomes "profile"
        const profileAccount = await program.account.profile.fetch(profilePda);
        setProfile(profileAccount);
      } catch (error: any) {
        // Profile doesn't exist
        console.log('Profile not found:', error);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!publicKey || !connection || !username.trim()) {
      return;
    }

    // Check if wallet is connected and has required methods
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert('Wallet not properly connected. Please connect your wallet and try again.');
      return;
    }

    try {
      setCreatingProfile(true);

      // Create name buffer (32 bytes)
      const nameBuffer = Buffer.alloc(32);
      Buffer.from(username.trim()).copy(nameBuffer);

      // Create client - pass full wallet context (same as MyBets)
      const client = new BetClient(wallet as any, connection);
      const program = client.getProgram();
      const provider = program.provider as AnchorProvider;

      // Find profile PDA
      const [profilePda] = await PublicKey.findProgramAddress(
        [Buffer.from('profile-'), publicKey.toBuffer()],
        PROGRAM_ID
      );

      console.log('Creating profile with:', {
        wallet: publicKey.toString(),
        profilePda: profilePda.toString(),
        username: username.trim(),
        providerWallet: provider.wallet.publicKey?.toString()
      });

      // Build instruction manually (same pattern as MyBets)
      const instruction = await program.methods
        .createProfile(Array.from(nameBuffer))
        .accounts({
          wallet: publicKey,
          profile: profilePda,
          system_program: SystemProgram.programId,
        })
        .instruction();

      // Create and send transaction manually
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign transaction
      const signedTransaction = await wallet.signTransaction!(transaction);
      
      // Send transaction
      const tx = await connection.sendRawTransaction(signedTransaction.serialize());

      console.log('Create profile tx:', tx);
      
      // Wait for confirmation
      await connection.confirmTransaction(tx, 'confirmed');
      console.log('Transaction confirmed');
      
      // Refresh profile
      await fetchProfile();
      
      // Close popup
      setShowCreateProfile(false);
      setUsername('');
    } catch (error: any) {
      console.error('Error creating profile:', error);
      
      // Extract error message
      let errorMessage = 'Failed to create profile. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.toString) {
        errorMessage = error.toString();
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Check for specific error types
      if (errorMessage.includes('User rejected')) {
        errorMessage = 'Transaction was cancelled.';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds. Please ensure you have enough SOL.';
      } else if (errorMessage.includes('Wallet not connected')) {
        errorMessage = 'Wallet not connected. Please connect your wallet.';
      }
      
      alert(errorMessage);
    } finally {
      setCreatingProfile(false);
    }
  };

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
          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#888'
            }}>
              <p>Loading profile...</p>
            </div>
          ) : profile ? (
            <>
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
                    {Buffer.from(profile.name).toString().replace(/\0/g, '').trim() || 'Username'}
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
                    {profile.totalMyBetCount}
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
                    {profile.totalMyBetWins + profile.totalAcceptedBetWins}
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
                    {profile.totalMyBetLosses + profile.totalAcceptedBetLosses}
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
                    color: Number(profile.totalProfit) >= 0 ? '#00d4aa' : '#ff6b6b'
                  }}>
                    ${(Number(profile.totalProfit) / 1e9).toFixed(2)}
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
                    {(() => {
                      const total = profile.totalMyBetWins + profile.totalMyBetLosses + profile.totalAcceptedBetWins + profile.totalAcceptedBetLosses;
                      const wins = profile.totalMyBetWins + profile.totalAcceptedBetWins;
                      return total > 0 ? Math.round((wins / total) * 100) : 0;
                    })()}%
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
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px'
            }}>
              <p style={{
                fontSize: '18px',
                color: '#888',
                marginBottom: '24px'
              }}>
                {publicKey ? 'You need to create a profile to start betting.' : 'Please connect your wallet to view your profile.'}
              </p>
              {publicKey && (
                <button
                  onClick={() => setShowCreateProfile(true)}
                  style={{
                    padding: '12px 24px',
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
                  Create Profile
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Profile Modal */}
      {showCreateProfile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }} onClick={() => setShowCreateProfile(false)}>
          <div
            style={{
              backgroundColor: '#0a0e1a',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '500px',
              border: '1px solid #2a2f45',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCreateProfile(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              &times;
            </button>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '24px'
            }}>
              Create Profile
            </h2>
            <div style={{
              marginBottom: '24px'
            }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '8px'
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username (max 32 characters)"
                maxLength={32}
                autoFocus
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #2a2f45',
                  backgroundColor: '#1a1f35',
                  color: '#ffffff',
                  fontSize: '16px',
                  width: '100%',
                  fontFamily: 'inherit',
                  cursor: 'text',
                  outline: 'none'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && username.trim() && !creatingProfile) {
                    handleCreateProfile();
                  }
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowCreateProfile(false);
                  setUsername('');
                }}
                disabled={creatingProfile}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #2a2f45',
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: creatingProfile ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                  opacity: creatingProfile ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!creatingProfile) {
                    e.currentTarget.style.backgroundColor = '#1a1f35';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creatingProfile) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProfile}
                disabled={!username.trim() || creatingProfile}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: creatingProfile || !username.trim() ? '#666' : '#ff8c00',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: creatingProfile || !username.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (!creatingProfile && username.trim()) {
                    e.currentTarget.style.backgroundColor = '#ff9500';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creatingProfile && username.trim()) {
                    e.currentTarget.style.backgroundColor = '#ff8c00';
                  }
                }}
              >
                {creatingProfile ? 'Creating...' : 'Create Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

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
