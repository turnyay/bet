import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import { Header } from '../components/Header';
import { BetDetailsModal } from '../components/BetDetailsModal';
import { PROGRAM_ID, BetClient, IDL } from '../lib/bet';

interface Bet {
  id: string;
  publicKey: PublicKey;
  creator: string;
  creatorFull: PublicKey;
  creatorUsername: string | null;
  acceptorUsername: string | null;
  description: string;
  category: string;
  categoryNum: number;
  amount: number;
  ratio: string;
  payout: string;
  status: number;
  expiresAt: number;
  acceptor: PublicKey | null;
  refereeType: number;
  createdAt: number;
  acceptedAt: number | null;
  resolvedAt: number | null;
  winner: PublicKey | null;
}

const Explore: React.FC = () => {
  const wallet = useWallet();
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
  const [selectedTab, setSelectedTab] = useState<string>('Open Bets');
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [acceptingBet, setAcceptingBet] = useState<boolean>(false);
  const [resolvingBet, setResolvingBet] = useState<boolean>(false);
  const [cancellingBet, setCancellingBet] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [creatorUsername, setCreatorUsername] = useState<string | null>(null);
  const [acceptorUsername, setAcceptorUsername] = useState<string | null>(null);
  const [usernameCache, setUsernameCache] = useState<Map<string, string>>(new Map());

  const getCategoryText = (cat: number): string => {
    switch (cat) {
      case 0: return 'Sports';
      case 1: return 'Personal Growth';
      case 2: return 'Politics';
      case 3: return 'Crypto';
      case 4: return 'World Events';
      case 5: return 'Entertainment';
      case 6: return 'Technology';
      case 7: return 'Business';
      case 8: return 'Weather';
      case 9: return 'Other';
      default: return 'Other';
    }
  };

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
          const creatorAddress = creatorPubkey.toBase58();
          // Read username from bet account
          const creatorUsernameBytes = betAccount.creatorUsername as number[] | undefined;
          const creatorUsername = creatorUsernameBytes 
            ? Buffer.from(creatorUsernameBytes).toString('utf8').replace(/\0/g, '').trim() || null
            : null;
          // Show only username, no address
          const creatorDisplay = creatorUsername || 'Anonymous';
          
          const amount = Number(betAccount.betAmount) / 1e9; // Convert lamports to SOL
          const oddsWin = Number(betAccount.oddsWin);
          const oddsLose = Number(betAccount.oddsLose);
          const ratio = `${oddsWin} : ${oddsLose}`;
          const profit = (amount * oddsWin / oddsLose).toFixed(2);
          const payout = `${creatorDisplay} gets ${profit} SOL if completed`;
          
          // Get category from bet account
          const categoryNum = betAccount.category !== undefined ? betAccount.category : 9;
          const category = getCategoryText(categoryNum);
          
          const acceptorPubkey = betAccount.acceptor as PublicKey | null;
          // Read acceptor username from bet account
          const acceptorUsernameBytes = betAccount.acceptorUsername as number[] | undefined;
          const acceptorUsername = acceptorUsernameBytes && acceptorPubkey
            ? Buffer.from(acceptorUsernameBytes).toString('utf8').replace(/\0/g, '').trim() || null
            : null;
          const winnerPubkey = betAccount.winner as PublicKey | null;
          
          return {
            id: bet.publicKey.toBase58(),
            publicKey: bet.publicKey,
            creator: creatorDisplay,
            creatorFull: creatorPubkey,
            creatorUsername: creatorUsername,
            acceptorUsername: acceptorUsername,
            description,
            category,
            categoryNum,
            amount,
            ratio,
            payout,
            status: betAccount.status,
            expiresAt: Number(betAccount.expiresAt),
            acceptor: acceptorPubkey,
            refereeType: betAccount.refereeType || 0,
            createdAt: Number(betAccount.createdAt),
            acceptedAt: betAccount.acceptedAt ? Number(betAccount.acceptedAt) : null,
            resolvedAt: betAccount.resolvedAt ? Number(betAccount.resolvedAt) : null,
            winner: winnerPubkey,
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

  const getStatusText = (status: number): string => {
    switch (status) {
      case 0: return 'Open';
      case 1: return 'Accepted';
      case 2: return 'Cancelled';
      case 3: return 'Resolved';
      default: return 'Unknown';
    }
  };

  const getRefereeTypeText = (type: number): string => {
    switch (type) {
      case 0: return 'Honor System';
      case 1: return 'Oracle';
      case 2: return 'Third Party';
      case 3: return 'Smart Contract';
      default: return 'Unknown';
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const fetchProfileUsername = async (walletAddress: PublicKey): Promise<string | null> => {
    if (!connection) return null;
    
    // Check cache first
    const addressStr = walletAddress.toBase58();
    const cached = usernameCache.get(addressStr);
    if (cached !== undefined) {
      return cached || null;
    }
    
    // Try to get username from localStorage (for current user)
    const storedUsername = localStorage.getItem(`profile_username_${addressStr}`);
    if (storedUsername) {
      setUsernameCache(prev => {
        const newCache = new Map(prev);
        newCache.set(addressStr, storedUsername);
        return newCache;
      });
      return storedUsername;
    }
    
    // For other users, we can't fetch profile without username
    // This is a limitation - we'd need a wallet->username mapping service
    // For now, return null and cache empty string
    setUsernameCache(prev => {
      const newCache = new Map(prev);
      newCache.set(addressStr, '');
      return newCache;
    });
    return null;
  };

  // Helper function to fetch profile by username (when we have it)
  const fetchProfileByUsername = async (username: string): Promise<any | null> => {
    if (!connection || !username) return null;
    
    try {
      const program = new Program(IDL as Idl, PROGRAM_ID, new AnchorProvider(
        connection,
        {} as any,
        { commitment: 'confirmed' }
      ));

      // Create name buffer (32 bytes)
      const nameBuffer = Buffer.alloc(32);
      Buffer.from(username).copy(nameBuffer);

      const [profilePda] = await PublicKey.findProgramAddress(
        [Buffer.from('username-'), nameBuffer],
        PROGRAM_ID
      );

      try {
        const profileAccount = await program.account.profile.fetch(profilePda);
        // Store wallet->username mapping in cache
        const walletStr = profileAccount.wallet.toString();
        setUsernameCache(prev => {
          const newCache = new Map(prev);
          newCache.set(walletStr, username);
          return newCache;
        });
        return profileAccount;
      } catch (error) {
        return null;
      }
    } catch (error) {
      console.error('Error fetching profile by username:', error);
      return null;
    }
  };

  const handleBetClick = async (bet: Bet) => {
    setSelectedBet(bet);
    // Usernames are already in the bet object
    setCreatorUsername(bet.creatorUsername);
    setAcceptorUsername(bet.acceptorUsername);
  };

  const formatAddress = (address: PublicKey): string => {
    const addr = address.toBase58();
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const formatUserDisplay = (address: PublicKey, username: string | null): string => {
    const shortAddr = formatAddress(address);
    if (username) {
      return `${username} (${shortAddr})`;
    }
    return shortAddr;
  };

  const handleResolveBet = async (bet: Bet, winnerIsCreator: boolean) => {
    if (!wallet.publicKey || !wallet.signTransaction || !connection) {
      showNotification('Please connect your wallet to resolve bets', 'error');
      return;
    }

    if (!bet.acceptor) {
      showNotification('Bet must be accepted before it can be resolved', 'error');
      return;
    }

    try {
      setResolvingBet(true);

      const client = new BetClient(wallet as any, connection);
      const program = client.getProgram();

      // Get usernames from bet account
      const betAccount = await program.account.bet.fetch(bet.publicKey);
      const creatorUsernameBytes = betAccount.creatorUsername as number[] | undefined;
      const creatorUsername = creatorUsernameBytes 
        ? Buffer.from(creatorUsernameBytes).toString('utf8').replace(/\0/g, '').trim()
        : null;
      const acceptorUsernameBytes = betAccount.acceptorUsername as number[] | undefined;
      const acceptorUsername = acceptorUsernameBytes 
        ? Buffer.from(acceptorUsernameBytes).toString('utf8').replace(/\0/g, '').trim()
        : null;

      if (!creatorUsername || !acceptorUsername) {
        showNotification('Unable to find usernames from bet account. Please ensure profiles exist.', 'error');
        setResolvingBet(false);
        return;
      }

      // Create name buffers (32 bytes) from usernames
      const creatorNameBuffer = Buffer.alloc(32);
      Buffer.from(creatorUsername).copy(creatorNameBuffer);
      const acceptorNameBuffer = Buffer.alloc(32);
      Buffer.from(acceptorUsername).copy(acceptorNameBuffer);

      // Find profile PDAs using usernames
      const [creatorProfilePda] = await PublicKey.findProgramAddress(
        [Buffer.from('username-'), creatorNameBuffer],
        PROGRAM_ID
      );

      const [acceptorProfilePda] = await PublicKey.findProgramAddress(
        [Buffer.from('username-'), acceptorNameBuffer],
        PROGRAM_ID
      );

      // Calculate treasury PDA
      const [treasuryPda] = await PublicKey.findProgramAddress(
        [Buffer.from('bet-treasury-'), bet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Get treasury balance before resolving
      const treasuryBalance = await connection.getBalance(treasuryPda);
      const treasuryBalanceSOL = treasuryBalance / 1e9;

      // Call resolve_bet instruction
      const tx = await program.methods
        .resolveBet(winnerIsCreator)
        .accounts({
          resolver: wallet.publicKey,
          creator: bet.creatorFull,
          acceptor: bet.acceptor,
          creatorProfile: creatorProfilePda,
          acceptorProfile: acceptorProfilePda,
          bet: bet.publicKey,
          treasury: treasuryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Resolve bet tx:', tx);
      
      await connection.confirmTransaction(tx, 'confirmed');
      
      // Determine winner name for notification
      const winnerName = winnerIsCreator ? 'Creator' : 'Acceptor';
      showNotification(`Bet resolved successfully! ${winnerName} won ${treasuryBalanceSOL.toFixed(4)} SOL`, 'success');
      
      // Refresh wallet balance if user is the winner
      if ((winnerIsCreator && wallet.publicKey.toBase58() === bet.creatorFull.toBase58()) ||
          (!winnerIsCreator && wallet.publicKey.toBase58() === bet.acceptor.toBase58())) {
        // Trigger balance refresh by fetching connection info
        await connection.getBalance(wallet.publicKey, 'confirmed');
        // Trigger balance refresh in Header
        window.dispatchEvent(new Event('refreshBalance'));
      }
      
      // Refresh bets and close popup
      await fetchBets();
      setSelectedBet(null);
    } catch (error: any) {
      console.error('Error resolving bet:', error);
      const errorMessage = error.message || 'Please try again.';
      console.error(`Failed to resolve bet: ${errorMessage}`);
      showNotification(`Failed to resolve bet: ${errorMessage}`, 'error');
    } finally {
      setResolvingBet(false);
    }
  };

  const handleCancelBet = async (bet: Bet) => {
    if (!wallet.publicKey || !wallet.signTransaction || !connection) {
      showNotification('Please connect your wallet to cancel bets', 'error');
      return;
    }

    if (bet.creatorFull.toBase58() !== wallet.publicKey.toBase58()) {
      showNotification('Only the bet creator can cancel this bet', 'error');
      return;
    }

    if (bet.status !== 0) {
      showNotification('Only open bets can be cancelled', 'error');
      return;
    }

    try {
      setCancellingBet(true);

      const client = new BetClient(wallet as any, connection);
      const program = client.getProgram();

      // Get creator username from bet account
      const betAccount = await program.account.bet.fetch(bet.publicKey);
      const creatorUsernameBytes = betAccount.creatorUsername as number[] | undefined;
      const creatorUsername = creatorUsernameBytes 
        ? Buffer.from(creatorUsernameBytes).toString('utf8').replace(/\0/g, '').trim()
        : null;

      if (!creatorUsername) {
        showNotification('Unable to find creator username from bet account', 'error');
        setCancellingBet(false);
        return;
      }

      // Create name buffer (32 bytes) from username
      const nameBuffer = Buffer.alloc(32);
      Buffer.from(creatorUsername).copy(nameBuffer);

      // Find profile PDA using username
      const [profilePda] = await PublicKey.findProgramAddress(
        [Buffer.from('username-'), nameBuffer],
        PROGRAM_ID
      );

      // Calculate treasury PDA
      const [treasuryPda] = await PublicKey.findProgramAddress(
        [Buffer.from('bet-treasury-'), bet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Get treasury balance before canceling
      const treasuryBalance = await connection.getBalance(treasuryPda);
      const treasuryBalanceSOL = treasuryBalance / 1e9;

      // Call cancel_bet instruction
      const tx = await program.methods
        .cancelBet()
        .accounts({
          creator: wallet.publicKey,
          profile: profilePda,
          bet: bet.publicKey,
          treasury: treasuryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Cancel bet tx:', tx);
      
      await connection.confirmTransaction(tx, 'confirmed');
      
      showNotification(`Bet cancelled successfully! ${treasuryBalanceSOL.toFixed(4)} SOL returned`, 'success');
      
      // Refresh wallet balance
      await connection.getBalance(wallet.publicKey, 'confirmed');
      
      // Trigger balance refresh in Header
      window.dispatchEvent(new Event('refreshBalance'));
      
      // Refresh bets and close popup if open
      await fetchBets();
      if (selectedBet && selectedBet.publicKey.toBase58() === bet.publicKey.toBase58()) {
        setSelectedBet(null);
      }
    } catch (error: any) {
      console.error('Error cancelling bet:', error);
      const errorMessage = error.message || 'Please try again.';
      console.error(`Failed to cancel bet: ${errorMessage}`);
      showNotification(`Failed to cancel bet: ${errorMessage}`, 'error');
    } finally {
      setCancellingBet(false);
    }
  };

  const handleAcceptBet = async (bet: Bet) => {
    if (!wallet.publicKey || !wallet.signTransaction || !connection) {
      showNotification('Please connect your wallet to accept bets', 'error');
      return;
    }

    try {
      setAcceptingBet(true);

      const client = new BetClient(wallet as any, connection);
      const program = client.getProgram();

      // Find profile by searching all profiles and matching wallet
      let profileAccount = null;
      let acceptorProfilePda: PublicKey | null = null;
      
      try {
        const allProfiles = await program.account.profile.all();
        for (const profile of allProfiles) {
          if (profile.account.wallet.toString() === wallet.publicKey.toString()) {
            profileAccount = profile.account;
            // Get username from profile
            const nameBytes = profileAccount.name as number[];
            const username = Buffer.from(nameBytes).toString('utf8').replace(/\0/g, '').trim();
            
            // Derive profile PDA using username
            const nameBuffer = Buffer.alloc(32);
            Buffer.from(username).copy(nameBuffer);
            [acceptorProfilePda] = await PublicKey.findProgramAddress(
              [Buffer.from('username-'), nameBuffer],
              PROGRAM_ID
            );
            break;
          }
        }
      } catch (error) {
        console.error('Error searching for profile:', error);
      }

      if (!profileAccount || !acceptorProfilePda) {
        showNotification('Please create a profile first before accepting bets', 'error');
        setAcceptingBet(false);
        return;
      }

      // Verify profile exists and wallet matches
      try {
        const profileAccount = await program.account.profile.fetch(acceptorProfilePda);
        if (profileAccount.wallet.toString() !== wallet.publicKey.toString()) {
          showNotification('Profile wallet mismatch. Please contact support.', 'error');
          setAcceptingBet(false);
          return;
        }
      } catch (error) {
        showNotification('Profile not found. Please create a profile first.', 'error');
        setAcceptingBet(false);
        return;
      }

      // Calculate treasury PDA
      const [treasuryPda] = await PublicKey.findProgramAddress(
        [Buffer.from('bet-treasury-'), bet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Call accept_bet instruction
      const tx = await program.methods
        .acceptBet()
        .accounts({
          acceptor: wallet.publicKey,
          creator: bet.creatorFull,
          acceptorProfile: acceptorProfilePda,
          bet: bet.publicKey,
          treasury: treasuryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Accept bet tx:', tx);
      
      await connection.confirmTransaction(tx, 'confirmed');
      
      showNotification('Bet accepted successfully!', 'success');
      
      // Refresh wallet balance
      await connection.getBalance(wallet.publicKey, 'confirmed');
      
      // Trigger balance refresh in Header
      window.dispatchEvent(new Event('refreshBalance'));
      
      // Refresh bets and close popup
      await fetchBets();
      setSelectedBet(null);
    } catch (error: any) {
      console.error('Error accepting bet:', error);
      const errorMessage = error.message || 'Please try again.';
      console.error(`Failed to accept bet: ${errorMessage}`);
      showNotification(`Failed to accept bet: ${errorMessage}`, 'error');
    } finally {
      setAcceptingBet(false);
    }
  };

  // Filter bets by category
  const categoryFilteredBets = selectedCategory === 'All' 
    ? bets 
    : bets.filter(bet => bet.category === selectedCategory);

  // Filter bets by tab (status)
  const filteredBets = categoryFilteredBets.filter(bet => {
    if (selectedTab === 'Open Bets') {
      return bet.status === 0; // Open
    } else if (selectedTab === 'Active Bets') {
      return bet.status === 1; // Accepted
    } else if (selectedTab === 'Completed Bets') {
      return bet.status === 3; // Only Resolved (exclude Cancelled)
    }
    return true;
  });

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

        {/* Bets Section */}
        <div style={{
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
          padding: '40px'
        }}>
          {/* Tab Bar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '32px',
            borderBottom: '2px solid #2a2f45'
          }}>
            {['Open Bets', 'Active Bets', 'Completed Bets'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: selectedTab === tab ? '#ff8c00' : '#888',
                  fontSize: '16px',
                  fontWeight: selectedTab === tab ? '600' : '400',
                  cursor: 'pointer',
                  borderBottom: selectedTab === tab ? '2px solid #ff8c00' : '2px solid transparent',
                  marginBottom: '-2px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedTab !== tab) {
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTab !== tab) {
                    e.currentTarget.style.color = '#888';
                  }
                }}
              >
                {tab}
              </button>
            ))}
          </div>

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
              {filteredBets.map((bet) => {
                // Determine if bet is resolved, cancelled, and if current user won/lost
                const isResolved = bet.status === 3;
                const isCancelled = bet.status === 2;
                const currentUserPubkey = wallet.publicKey?.toBase58();
                
                // Check if user is involved in the bet (creator or acceptor)
                const userIsCreator = currentUserPubkey && bet.creatorFull.toBase58() === currentUserPubkey;
                const userIsAcceptor = currentUserPubkey && bet.acceptor && bet.acceptor.toBase58() === currentUserPubkey;
                const userIsInvolved = userIsCreator || userIsAcceptor;
                
                // Determine win/loss for resolved bets based on bet account outcome
                let showSuccess = false;
                let showFail = false;
                
                if (isResolved && bet.winner) {
                  const winnerPubkey = bet.winner.toBase58();
                  const creatorWon = winnerPubkey === bet.creatorFull.toBase58();
                  
                  // Always show based on bet account outcome: creator won = SUCCESS, acceptor won = FAIL
                  showSuccess = creatorWon;
                  showFail = !creatorWon;
                }
                
                // Determine card styling
                const cardBgColor = showSuccess ? '#0d2818' : showFail ? '#2d0d0d' : isCancelled ? '#1a1a1a' : '#0a0e1a';
                const cardBorderColor = showSuccess ? '#22c55e' : showFail ? '#ef4444' : isCancelled ? '#888888' : '#2a2f45';
                
                return (
                <div
                  key={bet.id}
                  onClick={() => handleBetClick(bet)}
                  style={{
                  backgroundColor: cardBgColor,
                  borderRadius: '12px',
                  padding: '24px',
                  border: `1px solid ${cardBorderColor}`,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ff8c00';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = cardBorderColor;
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
                          bets {bet.amount.toFixed(4)} SOL
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
                        border: '1px solid #3a3f55',
                        marginRight: '8px'
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
                      {/* Status badges */}
                      {isCancelled && (
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#6b7280',
                          border: '1px solid #9ca3af'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: '#ffffff',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Cancelled
                          </span>
                        </div>
                      )}
                      {isResolved && (
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          backgroundColor: showSuccess ? '#22c55e' : showFail ? '#ef4444' : '#2a2f45',
                          border: `1px solid ${showSuccess ? '#16a34a' : showFail ? '#dc2626' : '#3a3f55'}`
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: '#ffffff',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {showSuccess ? 'Resolved - Success' : showFail ? 'Resolved - Fail' : 'Resolved'}
                          </span>
                        </div>
                      )}
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bet Details Popup */}
      {selectedBet && (
        <BetDetailsModal
          isOpen={!!selectedBet}
          onClose={() => setSelectedBet(null)}
          description={selectedBet.description}
          amount={selectedBet.amount}
          ratio={selectedBet.ratio}
          status={selectedBet.status}
          expiresAt={selectedBet.expiresAt}
          createdAt={selectedBet.createdAt}
          category={selectedBet.category}
          refereeType={selectedBet.refereeType}
          creatorDisplay={formatUserDisplay(selectedBet.creatorFull, creatorUsername)}
          creatorPublicKey={selectedBet.creatorFull}
          acceptorDisplay={selectedBet.acceptor ? formatUserDisplay(selectedBet.acceptor, acceptorUsername) : null}
          statusText={getStatusText(selectedBet.status)}
          statusColor={selectedBet.status === 0 ? '#ff8c00' : selectedBet.status === 1 ? '#4CAF50' : '#888'}
          categoryText={selectedBet.category}
          refereeTypeText={getRefereeTypeText(selectedBet.refereeType)}
          showActions={true}
          onAcceptBet={() => handleAcceptBet(selectedBet)}
          onCancelBet={() => handleCancelBet(selectedBet)}
          acceptingBet={acceptingBet}
          cancellingBet={cancellingBet}
          isCreator={wallet.publicKey?.toBase58() === selectedBet.creatorFull.toBase58()}
          currentUserPublicKey={wallet.publicKey}
          showResolveButtons={selectedBet.status === 1 && 
            wallet.publicKey?.toBase58() === selectedBet.creatorFull.toBase58() &&
            selectedBet.refereeType === 0 &&
            Math.floor(Date.now() / 1000) > selectedBet.expiresAt}
          onResolveBet={(winnerIsCreator) => handleResolveBet(selectedBet, winnerIsCreator)}
          resolvingBet={resolvingBet}
          canResolve={selectedBet.status === 1 && 
            wallet.publicKey?.toBase58() === selectedBet.creatorFull.toBase58() &&
            selectedBet.refereeType === 0 &&
            Math.floor(Date.now() / 1000) > selectedBet.expiresAt}
          winner={selectedBet.winner}
        />
      )}

      {/* Notification Banner */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3000,
            padding: '16px 24px',
            borderRadius: '8px',
            backgroundColor: notification.type === 'success' ? '#4CAF50' : '#f44336',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '90%',
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
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
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Explore;
