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
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [requestedFriends, setRequestedFriends] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [acceptedFriends, setAcceptedFriends] = useState<any[]>([]);
  const [showAddFriendPopup, setShowAddFriendPopup] = useState<boolean>(false);
  const [selectedFriendProfile, setSelectedFriendProfile] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateProfile, setShowCreateProfile] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [creatingProfile, setCreatingProfile] = useState<boolean>(false);
  const [addingFriend, setAddingFriend] = useState<boolean>(false);
  const [acceptingFriend, setAcceptingFriend] = useState<boolean>(false);

  const walletAddress = publicKey ? publicKey.toString() : 'Not connected';
  const displayAddress = publicKey 
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : walletAddress;

  useEffect(() => {
    if (publicKey && connection) {
      fetchProfile();
      fetchAllProfiles();
    } else {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (profile && publicKey && connection) {
      fetchFriends();
    }
  }, [profile, publicKey, connection]);

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

      // Find profile by searching all profiles and matching wallet
      let profileAccount = null;
      
      try {
        const allProfiles = await program.account.profile.all();
        for (const profile of allProfiles) {
          if (profile.account.wallet.toString() === publicKey.toString()) {
            profileAccount = profile.account;
            break;
          }
        }
      } catch (error) {
        console.error('Error searching for profile:', error);
      }

      if (profileAccount) {
        setProfile(profileAccount);
      } else {
        console.log('Profile not found');
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

      // Create client - pass full wallet context (same as MyBets)
      const client = new BetClient(wallet as any, connection);
      const program = client.getProgram();
      const provider = program.provider as AnchorProvider;

      // Create name buffer (32 bytes)
      const nameBuffer = Buffer.alloc(32);
      Buffer.from(username.trim()).copy(nameBuffer);

      // Find profile PDA using username
      const [profilePda] = await PublicKey.findProgramAddress(
        [Buffer.from('username-'), nameBuffer],
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

  const fetchAllProfiles = async () => {
    if (!publicKey || !connection) return;

    try {
      const client = new BetClient(wallet, connection);
      const program = client.getProgram();
      
      const allProfilesData = await program.account.profile.all();
      // Filter out current user's profile
      const filteredProfiles = allProfilesData
        .map(p => p.account)
        .filter(p => p.wallet.toString() !== publicKey.toString());
      
      setAllProfiles(filteredProfiles);
    } catch (error) {
      console.error('Error fetching all profiles:', error);
    }
  };

  const fetchFriends = async () => {
    if (!publicKey || !connection || !profile) return;

    try {
      const client = new BetClient(wallet, connection);
      const program = client.getProgram();
      
      const requested: any[] = [];
      const sent: any[] = [];
      const accepted: any[] = [];
      
      // Fetch all friend accounts
      const allFriends = await program.account.friend.all();
      console.log('Fetched all friends:', allFriends.length);
      
      // Filter to only friends where current user is user_a or user_b
      for (const friendData of allFriends) {
        const friendAccount = friendData.account;
        const userAWallet = new PublicKey(friendAccount.userAWallet);
        const userBWallet = new PublicKey(friendAccount.userBWallet);
        const isUserA = userAWallet.toString() === publicKey.toString();
        const isUserB = userBWallet.toString() === publicKey.toString();
        
        if (!isUserA && !isUserB) {
          continue; // Not a friend of current user
        }
        
        // Determine which user is the current user and which is the friend
        const myStatus = isUserA ? friendAccount.userAStatus : friendAccount.userBStatus;
        const otherStatus = isUserA ? friendAccount.userBStatus : friendAccount.userAStatus;
        const otherUsername = isUserA ? friendAccount.userBUsername : friendAccount.userAUsername;
        const otherWallet = isUserA ? userBWallet : userAWallet;
        
        // Show as accepted if EITHER user_a OR user_b has status 2 (accepted)
        if (friendAccount.userAStatus === 2 || friendAccount.userBStatus === 2) {
          // At least one user has accepted - show as accepted for both users
          console.log('Found accepted friend:', {
            userAStatus: friendAccount.userAStatus,
            userBStatus: friendAccount.userBStatus,
            otherUsername: Buffer.from(otherUsername).toString().replace(/\0/g, '').trim(),
            isUserA,
            isUserB
          });
          accepted.push({
            account: friendAccount,
            pda: friendData.publicKey,
            otherUsername: otherUsername,
            otherWallet: otherWallet
          });
        } else if (otherStatus === 1 && myStatus === 0) {
          // Other user requested, I haven't responded yet
          requested.push({
            account: friendAccount,
            pda: friendData.publicKey,
            otherUsername: otherUsername,
            otherWallet: otherWallet
          });
        } else if (myStatus === 1 && otherStatus === 0) {
          // I sent a request, they haven't responded yet
          sent.push({
            account: friendAccount,
            pda: friendData.publicKey,
            otherUsername: otherUsername,
            otherWallet: otherWallet
          });
        }
      }
      
      console.log('Friends summary:', {
        requested: requested.length,
        sent: sent.length,
        accepted: accepted.length
      });
      
      setRequestedFriends(requested);
      setSentRequests(sent);
      setAcceptedFriends(accepted);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const handleAddFriend = async (friendProfile: any) => {
    if (!publicKey || !connection || !wallet.publicKey || !wallet.signTransaction) {
      alert('Wallet not properly connected.');
      return;
    }

    if (!profile) {
      alert('Please create a profile first.');
      return;
    }

    try {
      setAddingFriend(true);

      const client = new BetClient(wallet as any, connection);
      const program = client.getProgram();

      // Get username from current user's profile
      const nameBytes = profile.name as number[];
      const username = Buffer.from(nameBytes).toString('utf8').replace(/\0/g, '').trim();
      const nameBuffer = Buffer.alloc(32);
      Buffer.from(username).copy(nameBuffer);
      const [userProfilePda] = await PublicKey.findProgramAddress(
        [Buffer.from('username-'), nameBuffer],
        PROGRAM_ID
      );

      // Get friend's profile PDA
      const friendNameBytes = friendProfile.name as number[];
      const friendUsername = Buffer.from(friendNameBytes).toString('utf8').replace(/\0/g, '').trim();
      const friendNameBuffer = Buffer.alloc(32);
      Buffer.from(friendUsername).copy(friendNameBuffer);
      const [friendProfilePda] = await PublicKey.findProgramAddress(
        [Buffer.from('username-'), friendNameBuffer],
        PROGRAM_ID
      );

      // Get friend wallet as PublicKey
      const friendWallet = friendProfile.wallet instanceof PublicKey 
        ? friendProfile.wallet 
        : new PublicKey(friendProfile.wallet);

      // Derive friend account PDA - sort wallets to ensure consistent PDA
      // Backend expects wallets in sorted order (smaller first) in the constraint
      const wallets = [publicKey, friendWallet].sort((a, b) => {
        const aBytes = a.toBuffer();
        const bBytes = b.toBuffer();
        for (let i = 0; i < 32; i++) {
          if (aBytes[i] < bBytes[i]) return -1;
          if (aBytes[i] > bBytes[i]) return 1;
        }
        return 0;
      });
      
      const [friendAccountPda] = await PublicKey.findProgramAddress(
        [Buffer.from('friend-'), wallets[0].toBuffer(), wallets[1].toBuffer()],
        PROGRAM_ID
      );

      // Determine which wallet is smaller to match the constraint order
      // Constraint expects: user.key() (smaller) first, friend_profile.wallet (larger) second
      const userBytes = publicKey.toBuffer();
      const friendBytes = friendWallet.toBuffer();
      let isUserSmaller = false;
      for (let i = 0; i < 32; i++) {
        if (userBytes[i] < friendBytes[i]) {
          isUserSmaller = true;
          break;
        } else if (userBytes[i] > friendBytes[i]) {
          isUserSmaller = false;
          break;
        }
      }

      // Build instruction - accounts must match the sorted PDA order
      const instruction = await program.methods
        .addFriend()
        .accounts({
          user: isUserSmaller ? publicKey : friendWallet,
          userProfile: isUserSmaller ? userProfilePda : friendProfilePda,
          friendProfile: isUserSmaller ? friendProfilePda : userProfilePda,
          friendAccount: friendAccountPda,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // Create and send transaction
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await wallet.signTransaction!(transaction);
      const tx = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(tx, 'confirmed');

      // Refresh data
      await fetchProfile();
      await fetchFriends();
      setSelectedFriendProfile(null);
      // Keep popup open so user can add more friends
    } catch (error: any) {
      console.error('Error adding friend:', error);
      let errorMessage = 'Failed to add friend. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    } finally {
      setAddingFriend(false);
    }
  };

  const handleAcceptFriend = async (friendData: any) => {
    if (!publicKey || !connection || !wallet.publicKey || !wallet.signTransaction) {
      alert('Wallet not properly connected.');
      return;
    }

    try {
      setAcceptingFriend(true);

      const client = new BetClient(wallet as any, connection);
      const program = client.getProgram();

      // The friend account PDA is already in friendData.pda from fetchFriends
      // Build instruction - only need the single friend account
      const instruction = await program.methods
        .acceptFriend()
        .accounts({
          user: publicKey,
          friendAccount: friendData.pda,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // Create and send transaction
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await wallet.signTransaction!(transaction);
      const tx = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(tx, 'confirmed');

      // Refresh data
      await fetchProfile();
      await fetchFriends();
    } catch (error: any) {
      console.error('Error accepting friend:', error);
      let errorMessage = 'Failed to accept friend. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    } finally {
      setAcceptingFriend(false);
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

                {/* My Bet Stats */}
                <div style={{
                  width: '100%',
                  marginBottom: '32px'
                }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#ffffff',
                    marginBottom: '16px'
                  }}>
                    My Bet Stats
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
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
                        {Math.max(0, (profile.totalMyBetCount || 0) - (profile.cancelledBetCount || 0))}
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
                        Bets Won/Lost (%)
                      </div>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#ffffff'
                      }}>
                        {(() => {
                          const wins = profile.totalMyBetWins;
                          const losses = profile.totalMyBetLosses;
                          const total = wins + losses;
                          if (total === 0) return '0 / 0 (0%)';
                          const winRate = Math.round((wins / total) * 100);
                          return `${wins} / ${losses} (${winRate}%)`;
                        })()}
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
                        Profit
                      </div>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: Number(profile.totalMyBetProfit) >= 0 ? '#00d4aa' : '#ff6b6b'
                      }}>
                        {(Number(profile.totalMyBetProfit || 0) / 1e9).toFixed(2)} SOL
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
                        {(Number(profile.totalMyBetVolume || 0) / 1e9).toFixed(2)} SOL
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accepted Bets Stats */}
                <div style={{
                  width: '100%'
                }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#ffffff',
                    marginBottom: '16px'
                  }}>
                    Accepted Bets Stats
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
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
                        {profile.totalBetsAcceptedCount}
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
                        Bets Won/Lost (%)
                      </div>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#ffffff'
                      }}>
                        {(() => {
                          const wins = profile.totalAcceptedBetWins;
                          const losses = profile.totalAcceptedBetLosses;
                          const total = wins + losses;
                          if (total === 0) return '0 / 0 (0%)';
                          const winRate = Math.round((wins / total) * 100);
                          return `${wins} / ${losses} (${winRate}%)`;
                        })()}
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
                        Profit
                      </div>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: Number(profile.totalAcceptedBetProfit || 0) >= 0 ? '#00d4aa' : '#ff6b6b'
                      }}>
                        {(Number(profile.totalAcceptedBetProfit || 0) / 1e9).toFixed(2)} SOL
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
                        {(Number(profile.totalAcceptedBetVolume || 0) / 1e9).toFixed(2)} SOL
                      </div>
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
                onClick={() => setShowAddFriendPopup(true)}
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

            {/* Sent Requests */}
            {sentRequests.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '16px'
                }}>
                  Sent Requests
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {sentRequests.map((friendData, index) => {
                    const username = Buffer.from(friendData.otherUsername).toString().replace(/\0/g, '').trim() || 'Unknown';
                    return (
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
                          {username}
                        </span>
                        <span style={{
                          color: '#ff8c00',
                          fontSize: '14px'
                        }}>
                          Pending
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Requested Friends */}
            {requestedFriends.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '16px'
                }}>
                  Friend Requests
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {requestedFriends.map((friendData, index) => {
                    const username = Buffer.from(friendData.otherUsername).toString().replace(/\0/g, '').trim() || 'Unknown';
                    return (
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
                          {username}
                        </span>
                        <button
                          onClick={() => handleAcceptFriend(friendData)}
                          disabled={acceptingFriend}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: acceptingFriend ? '#666' : '#00d4aa',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: acceptingFriend ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            fontFamily: 'inherit'
                          }}
                          onMouseEnter={(e) => {
                            if (!acceptingFriend) {
                              e.currentTarget.style.backgroundColor = '#00e6b8';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!acceptingFriend) {
                              e.currentTarget.style.backgroundColor = '#00d4aa';
                            }
                          }}
                        >
                          {acceptingFriend ? 'Accepting...' : 'Accept'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Accepted Friends */}
            {acceptedFriends.length > 0 && (
              <div>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '16px'
                }}>
                  Accepted Friends
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {acceptedFriends.map((friendData, index) => {
                    const username = Buffer.from(friendData.otherUsername).toString().replace(/\0/g, '').trim() || 'Unknown';
                    return (
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
                          {username}
                        </span>
                        <span style={{
                          color: '#00d4aa',
                          fontSize: '14px'
                        }}>
                          Accepted
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {sentRequests.length === 0 && requestedFriends.length === 0 && acceptedFriends.length === 0 && (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#888'
              }}>
                <p style={{
                  fontSize: '16px',
                  margin: 0
                }}>
                  No friends yet. Click "Add Friend" to get started!
                </p>
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

      {/* Add Friend Popup */}
      {showAddFriendPopup && (
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
        }} onClick={() => {
          setShowAddFriendPopup(false);
          setSelectedFriendProfile(null);
        }}>
          <div
            style={{
              backgroundColor: '#0a0e1a',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '80vh',
              border: '1px solid #2a2f45',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowAddFriendPopup(false);
                setSelectedFriendProfile(null);
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '24px',
                cursor: 'pointer',
                zIndex: 1
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
              Add Friend
            </h2>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              marginBottom: '16px'
            }}>
              {allProfiles.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#888'
                }}>
                  <p style={{ margin: 0 }}>No other profiles found.</p>
                </div>
              ) : (
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}>
                  <thead style={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#0a0e1a',
                    zIndex: 10
                  }}>
                    <tr style={{
                      borderBottom: '1px solid #2a2f45'
                    }}>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        color: '#888',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>Username</th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'right',
                        color: '#888',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProfiles
                      .filter((profileData) => {
                        // Exclude accepted friends, requested friends (received), and sent requests
                        const profileWallet = profileData.wallet instanceof PublicKey 
                          ? profileData.wallet 
                          : new PublicKey(profileData.wallet);
                        const isAccepted = acceptedFriends.some(f => 
                          f.otherWallet.toString() === profileWallet.toString()
                        );
                        const isRequested = requestedFriends.some(f => 
                          f.otherWallet.toString() === profileWallet.toString()
                        );
                        const isSent = sentRequests.some(f => 
                          f.otherWallet.toString() === profileWallet.toString()
                        );
                        return !isAccepted && !isRequested && !isSent;
                      })
                      .map((profileData, index) => {
                        const username = Buffer.from(profileData.name).toString().replace(/\0/g, '').trim() || 'Unknown';
                        
                        return (
                          <tr
                            key={index}
                            style={{
                              borderBottom: '1px solid #2a2f45'
                            }}
                          >
                            <td style={{
                              padding: '12px',
                              color: '#ffffff',
                              fontSize: '16px'
                            }}>
                              {username}
                            </td>
                            <td style={{
                              padding: '12px',
                              textAlign: 'right'
                            }}>
                              <button
                                onClick={() => {
                                  setSelectedFriendProfile(profileData);
                                  handleAddFriend(profileData);
                                }}
                                disabled={addingFriend}
                                  style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: addingFriend ? '#666' : '#ff8c00',
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: addingFriend ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontFamily: 'inherit'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!addingFriend) {
                                      e.currentTarget.style.backgroundColor = '#ff9500';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!addingFriend) {
                                      e.currentTarget.style.backgroundColor = '#ff8c00';
                                    }
                                  }}
                                >
                                  Add
                                </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '16px',
              borderTop: '1px solid #2a2f45'
            }}>
              <button
                onClick={() => {
                  setShowAddFriendPopup(false);
                  setSelectedFriendProfile(null);
                }}
                style={{
                  padding: '12px 24px',
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
