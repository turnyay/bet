import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import { Header } from '../components/Header';
import { BetDetailsModal } from '../components/BetDetailsModal';
import { PROGRAM_ID, BetClient, IDL } from '../lib/bet';

interface MyBet {
  id: string;
  publicKey: PublicKey;
  description: string;
  amount: number;
  ratio: string;
  status: number;
  expiresAt: number;
  acceptor: string | null;
  acceptorPubkey?: PublicKey | null; // Full PublicKey of the acceptor
  acceptorUsername?: string | null; // Username of the acceptor
  createdAt: number;
  refereeType: number;
  category: number;
  winner: PublicKey | null;
  oddsWin: number;
  oddsLose: number;
  creator?: string | null; // For accepted bets, this shows who created the bet
  creatorPubkey?: PublicKey | null; // Full PublicKey of the creator (for accepted bets)
  creatorUsername?: string | null; // Username of the creator (for accepted bets)
  referee?: PublicKey | null; // Referee PublicKey
  refereeUsername?: string | null; // Username of the referee
}

// Countdown component for expiration time
const ExpirationCountdown: React.FC<{ expiresAt: number; status: number }> = ({ expiresAt, status }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      // If bet is cancelled (status === 2), show cancelled
      if (status === 2) {
        setTimeLeft('(cancelled)');
        return;
      }
      
      // If bet is resolved (status === 3), show expired
      if (status === 3) {
        setTimeLeft('(expired)');
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft('0s');
        return;
      }

      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}hr`);
      if (minutes > 0) parts.push(`${minutes}min`);
      if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

      setTimeLeft(parts.join(' '));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, status]);

  return <span>{timeLeft}</span>;
};

const MyBets: React.FC = () => {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const { connection } = useConnection();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [betAmount, setBetAmount] = useState<string>('1');
  const [description, setDescription] = useState<string>('');
  const [refereeType, setRefereeType] = useState<number>(0);
  const [category, setCategory] = useState<number>(9); // Default to "Other"
  const [oddsWin, setOddsWin] = useState<string>('3');
  const [oddsLose, setOddsLose] = useState<string>('1');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [creatingBet, setCreatingBet] = useState<boolean>(false);
  const [myBets, setMyBets] = useState<MyBet[]>([]);
  const [loadingBets, setLoadingBets] = useState<boolean>(false);
  const [acceptedBets, setAcceptedBets] = useState<MyBet[]>([]);
  const [loadingAcceptedBets, setLoadingAcceptedBets] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [friends, setFriends] = useState<string[]>([]);
  const [selectedReferee, setSelectedReferee] = useState<string>('');
  const [selectedBet, setSelectedBet] = useState<MyBet | null>(null);
  const [isBetModalOpen, setIsBetModalOpen] = useState<boolean>(false);
  const [resolvingBet, setResolvingBet] = useState<boolean>(false);
  const [cancellingBet, setCancellingBet] = useState<boolean>(false);

  const setExpirationDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    setExpiresAt(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const fetchProfileUsername = async (walletAddress: PublicKey): Promise<string | null> => {
    if (!connection) return null;
    
    try {
      const program = new Program(IDL as Idl, PROGRAM_ID, new AnchorProvider(
        connection,
        {} as any,
        { commitment: 'confirmed' }
      ));

      // Fetch all profiles and find the one matching the wallet
      const allProfiles = await program.account.profile.all();
      for (const profile of allProfiles) {
        if (profile.account.wallet.toString() === walletAddress.toBase58()) {
          const nameBytes = profile.account.name as number[];
          const username = Buffer.from(nameBytes).toString('utf8').replace(/\0/g, '').trim();
          return username || null;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile username:', error);
      return null;
    }
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
        return profileAccount;
      } catch (error) {
        return null;
      }
    } catch (error) {
      console.error('Error fetching profile by username:', error);
      return null;
    }
  };

  const calculatePayouts = () => {
    const amount = parseFloat(betAmount) || 0;
    const win = parseInt(oddsWin.trim(), 10) || 1;
    const lose = parseInt(oddsLose.trim(), 10) || 1;
    
    // Profit if you win: bet * win/lose ratio (not including your bet back)
    const yourProfit = (amount * win / lose).toFixed(2);
    // If you lose: they win your bet amount (not a calculated profit)
    const theirWin = amount.toFixed(2);
    
    return { yourProfit, theirWin };
  };

  const payouts = calculatePayouts();

  const fetchMyBets = async () => {
    if (!publicKey || !connection) {
      setMyBets([]);
      return;
    }

    try {
      setLoadingBets(true);
      
      // Create a read-only program instance
      const program = new Program(IDL as Idl, PROGRAM_ID, new AnchorProvider(
        connection,
        {} as any, // Dummy wallet - not needed for read operations
        { commitment: 'confirmed' }
      ));

      // Fetch all bet accounts
      const allBets = await program.account.bet.all();
      
      // Filter bets created by the current user
      const userBetsWithPubkeys: (MyBet & { acceptorPubkey: PublicKey | null })[] = allBets
        .filter((bet: any) => {
          const betAccount = bet.account;
          const creatorPubkey = betAccount.creator as PublicKey;
          // Read creator username from bet account
          const creatorUsernameBytes = betAccount.creatorUsername as number[] | undefined;
          const creatorUsername = creatorUsernameBytes 
            ? Buffer.from(creatorUsernameBytes).toString('utf8').replace(/\0/g, '').trim() || null
            : null;
          return creatorPubkey.toBase58() === publicKey.toBase58();
        })
        .map((bet: any) => {
          const betAccount = bet.account;
          const descriptionBytes = betAccount.description as number[] | undefined;
          const description = descriptionBytes 
            ? Buffer.from(descriptionBytes)
                .toString('utf8')
                .replace(/\0/g, '')
                .trim() || 'No description'
            : 'No description';
          
          const amount = Number(betAccount.betAmount) / 1e9; // Convert lamports to SOL
          const oddsWin = Number(betAccount.oddsWin);
          const oddsLose = Number(betAccount.oddsLose);
          const ratio = `${oddsWin} : ${oddsLose}`;
          
          const acceptorPubkey = betAccount.acceptor as PublicKey | null;
          // Read acceptor username from bet account
          const acceptorUsernameBytes = betAccount.acceptorUsername as number[] | undefined;
          const acceptorUsername = acceptorUsernameBytes && acceptorPubkey
            ? Buffer.from(acceptorUsernameBytes).toString('utf8').replace(/\0/g, '').trim() || null
            : null;
          const acceptor = acceptorPubkey 
            ? `${acceptorPubkey.toBase58().slice(0, 4)}...${acceptorPubkey.toBase58().slice(-4)}`
            : null;
          
          const winnerPubkey = betAccount.winner as PublicKey | null;
          const refereePubkey = betAccount.referee as PublicKey | null;
          
          return {
            id: bet.publicKey.toBase58(),
            publicKey: bet.publicKey,
            description,
            amount,
            ratio,
            status: betAccount.status,
            expiresAt: Number(betAccount.expiresAt),
            acceptor,
            acceptorPubkey,
            acceptorUsername,
            createdAt: Number(betAccount.createdAt),
            refereeType: betAccount.refereeType || 0,
            category: betAccount.category !== undefined ? betAccount.category : 9,
            winner: winnerPubkey,
            oddsWin,
            oddsLose,
            referee: refereePubkey,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt); // Sort by newest first
      
      // Fetch referee usernames for Third Party bets
      const refereePubkeys = new Set<string>();
      userBetsWithPubkeys.forEach(bet => {
        if (bet.refereeType === 2 && bet.referee) {
          refereePubkeys.add(bet.referee.toBase58());
        }
      });
      
      // Fetch profiles for referees
      const refereeUsernames = new Map<string, string>();
      if (refereePubkeys.size > 0) {
        try {
          const allProfiles = await program.account.profile.all();
          allProfiles.forEach((profile: any) => {
            const profileWallet = profile.account.wallet.toString();
            if (refereePubkeys.has(profileWallet)) {
              const nameBytes = profile.account.name as number[];
              const username = Buffer.from(nameBytes).toString('utf8').replace(/\0/g, '').trim();
              if (username) {
                refereeUsernames.set(profileWallet, username);
              }
            }
          });
        } catch (error) {
          console.error('Error fetching referee profiles:', error);
        }
      }
      
      // Add referee usernames to bets
      const userBets: MyBet[] = userBetsWithPubkeys.map(bet => ({
        ...bet,
        refereeUsername: bet.referee ? refereeUsernames.get(bet.referee.toBase58()) || null : null,
      }));
      
      setMyBets(userBets);
    } catch (error) {
      console.error('Error fetching my bets:', error);
      setMyBets([]);
    } finally {
      setLoadingBets(false);
    }
  };

  const fetchAcceptedBets = async () => {
    if (!publicKey || !connection) {
      setAcceptedBets([]);
      return;
    }

    try {
      setLoadingAcceptedBets(true);
      
      // Create a read-only program instance
      const program = new Program(IDL as Idl, PROGRAM_ID, new AnchorProvider(
        connection,
        {} as any, // Dummy wallet - not needed for read operations
        { commitment: 'confirmed' }
      ));

      // Fetch all bet accounts
      const allBets = await program.account.bet.all();
      
      // Filter bets accepted by the current user
      const userAcceptedBetsWithPubkeys: (MyBet & { creatorPubkey: PublicKey })[] = allBets
        .filter((bet: any) => {
          const betAccount = bet.account;
          const acceptorPubkey = betAccount.acceptor as PublicKey | null;
          return acceptorPubkey && acceptorPubkey.toBase58() === publicKey.toBase58();
        })
        .map((bet: any) => {
          const betAccount = bet.account;
          const descriptionBytes = betAccount.description as number[] | undefined;
          const description = descriptionBytes 
            ? Buffer.from(descriptionBytes)
                .toString('utf8')
                .replace(/\0/g, '')
                .trim() || 'No description'
            : 'No description';
          
          const amount = Number(betAccount.betAmount) / 1e9; // Convert lamports to SOL
          const oddsWin = Number(betAccount.oddsWin);
          const oddsLose = Number(betAccount.oddsLose);
          const ratio = `${oddsWin} : ${oddsLose}`;
          
          const creatorPubkey = betAccount.creator as PublicKey;
          const creator = creatorPubkey 
            ? `${creatorPubkey.toBase58().slice(0, 4)}...${creatorPubkey.toBase58().slice(-4)}`
            : null;
          
          const winnerPubkey = betAccount.winner as PublicKey | null;
          const refereePubkey = betAccount.referee as PublicKey | null;
          
          return {
            id: bet.publicKey.toBase58(),
            publicKey: bet.publicKey,
            description,
            amount,
            ratio,
            status: betAccount.status,
            expiresAt: Number(betAccount.expiresAt),
            acceptor: publicKey.toBase58(), // Current user is the acceptor
            acceptorPubkey: publicKey, // Current user is the acceptor
            createdAt: Number(betAccount.createdAt),
            refereeType: betAccount.refereeType || 0,
            category: betAccount.category !== undefined ? betAccount.category : 9,
            winner: winnerPubkey,
            oddsWin,
            oddsLose,
            creator: creator, // Store creator for display
            creatorPubkey, // Store pubkey for username lookup
            referee: refereePubkey,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt); // Sort by newest first
      
      // Fetch usernames for all creators, acceptor (current user), and referees
      const uniqueCreators = new Set<string>();
      const refereePubkeys = new Set<string>();
      userAcceptedBetsWithPubkeys.forEach(bet => {
        uniqueCreators.add(bet.creatorPubkey.toBase58());
        if (bet.refereeType === 2 && bet.referee) {
          refereePubkeys.add(bet.referee.toBase58());
        }
      });
      // Add current user (acceptor) to username fetch
      uniqueCreators.add(publicKey.toBase58());
      
      const usernamePromises = Array.from(uniqueCreators).map(async (address) => {
        try {
          const pubkey = new PublicKey(address);
          const username = await fetchProfileUsername(pubkey);
          return { address, username };
        } catch (error) {
          return { address, username: null };
        }
      });
      
      const usernameResults = await Promise.all(usernamePromises);
      const usernameMap = new Map<string, string>();
      usernameResults.forEach(({ address, username }) => {
        if (username) {
          usernameMap.set(address, username);
        }
      });
      
      // Fetch referee usernames for Third Party bets
      const refereeUsernamePromises = Array.from(refereePubkeys).map(async (address) => {
        try {
          const pubkey = new PublicKey(address);
          const username = await fetchProfileUsername(pubkey);
          return { address, username };
        } catch (error) {
          return { address, username: null };
        }
      });
      
      const refereeUsernameResults = await Promise.all(refereeUsernamePromises);
      refereeUsernameResults.forEach(({ address, username }) => {
        if (username) {
          usernameMap.set(address, username);
        }
      });
      
      // Update bets with usernames
      const userAcceptedBets: MyBet[] = userAcceptedBetsWithPubkeys.map(bet => ({
        ...bet,
        creatorUsername: usernameMap.get(bet.creatorPubkey.toBase58()) || null,
        acceptorUsername: usernameMap.get(publicKey.toBase58()) || null, // Current user is the acceptor
        refereeUsername: bet.referee ? usernameMap.get(bet.referee.toBase58()) || null : null,
      }));
      
      setAcceptedBets(userAcceptedBets);
    } catch (error) {
      console.error('Error fetching accepted bets:', error);
      setAcceptedBets([]);
    } finally {
      setLoadingAcceptedBets(false);
    }
  };

  useEffect(() => {
    fetchMyBets();
    fetchAcceptedBets();
    fetchAcceptedFriends();
  }, [publicKey, connection]);

  const fetchAcceptedFriends = async () => {
    if (!publicKey || !connection) {
      setFriends([]);
      return;
    }

    try {
      const client = new BetClient(wallet, connection);
      const program = client.getProgram();
      
      const acceptedFriends: Array<{ wallet: string; username: string }> = [];
      
      // Fetch all friend accounts
      const allFriends = await program.account.friend.all();
      
      // Filter to only accepted friends where current user is user_a or user_b
      for (const friendData of allFriends) {
        const friendAccount = friendData.account;
        const userAWallet = new PublicKey(friendAccount.userAWallet);
        const userBWallet = new PublicKey(friendAccount.userBWallet);
        const isUserA = userAWallet.toString() === publicKey.toString();
        const isUserB = userBWallet.toString() === publicKey.toString();
        
        if (!isUserA && !isUserB) {
          continue; // Not a friend of current user
        }
        
        // Show as accepted if EITHER user_a OR user_b has status 2 (accepted)
        if (friendAccount.userAStatus === 2 || friendAccount.userBStatus === 2) {
          // Get the other user's wallet and username
          const otherWallet = isUserA ? userBWallet : userAWallet;
          const otherUsername = isUserA ? friendAccount.userBUsername : friendAccount.userAUsername;
          const username = Buffer.from(otherUsername).toString('utf8').replace(/\0/g, '').trim() || otherWallet.toString().slice(0, 8);
          
          acceptedFriends.push({
            wallet: otherWallet.toString(),
            username: username
          });
        }
      }
      
      setFriends(acceptedFriends);
    } catch (error) {
      console.error('Error fetching accepted friends:', error);
      setFriends([]);
    }
  };

  const getStatusText = (status: number, bet: MyBet): string => {
    switch (status) {
      case 0: return 'Open';
      case 1: return 'Accepted';
      case 2: return 'Cancelled';
      case 3: {
        // Check if user won or lost
        if (bet.winner && publicKey && bet.winner.toBase58() === publicKey.toBase58()) {
          return 'WIN';
        } else if (bet.winner && publicKey && bet.winner.toBase58() !== publicKey.toBase58()) {
          return 'LOSS';
        }
        return 'Resolved';
      }
      default: return 'Unknown';
    }
  };

  const calculatePNL = (bet: MyBet): number => {
    if (bet.status !== 3 || !bet.winner || !publicKey) {
      return 0; // Not resolved or no winner
    }
    
    const userWon = bet.winner.toBase58() === publicKey.toBase58();
    
    if (userWon) {
      // User wins: profit = bet_amount * odds_win / odds_lose
      // This matches the profit calculation in resolve_bet.rs
      const profit = bet.amount * (bet.oddsWin / bet.oddsLose);
      return profit;
    } else {
      // User loses: loss = -bet_amount
      return -bet.amount;
    }
  };

  const getStatusColor = (status: number, bet?: MyBet): string => {
    switch (status) {
      case 0: return '#ff8c00'; // Orange for Open
      case 1: return '#4CAF50'; // Green for Accepted
      case 2: return '#888'; // Gray for Cancelled
      case 3: {
        // For resolved bets, check if user won or lost
        if (bet && bet.winner && publicKey) {
          if (bet.winner.toBase58() === publicKey.toBase58()) {
            return '#4CAF50'; // Green for Win
          } else {
            return '#f44336'; // Red for Loss
          }
        }
        return '#2196F3'; // Blue for Resolved (no winner info)
      }
      default: return '#888';
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

  const getCategoryText = (category: number): string => {
    switch (category) {
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

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const handleCancelBet = async (bet: MyBet) => {
    if (!wallet.publicKey || !wallet.signTransaction || !connection) {
      showNotification('Please connect your wallet to cancel bets', 'error');
      return;
    }

    // Only allow canceling for "My Bets" (user is creator)
    if (bet.creator) {
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
      
      // Refresh bets and close popup
      await fetchMyBets();
      await fetchAcceptedBets();
      setIsBetModalOpen(false);
      setSelectedBet(null);
    } catch (error: any) {
      console.error('Error cancelling bet:', error);
      const errorMessage = error.message || 'Please try again.';
      console.error(`Failed to cancel bet: ${errorMessage}`);
      showNotification(`Failed to cancel bet: ${errorMessage}`, 'error');
    } finally {
      setCancellingBet(false);
    }
  };

  const handleResolveBet = async (bet: MyBet, winnerIsCreator: boolean) => {
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

      // For "My Bets", the user is the creator
      // For "My Accepted Bets", bet.creator exists and user is the acceptor
      const isUserCreator = !bet.creator; // If creator field doesn't exist, user created the bet
      const creatorPubkey = isUserCreator ? wallet.publicKey : bet.creatorPubkey!;
      
      // Get acceptor pubkey
      const acceptorPubkey = isUserCreator 
        ? bet.acceptorPubkey
        : wallet.publicKey;

      if (!acceptorPubkey) {
        showNotification('Acceptor not found', 'error');
        return;
      }

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

      // Get referee from bet account
      const refereePubkey = new PublicKey(betAccount.referee);

      // Call resolve_bet instruction
      const tx = await program.methods
        .resolveBet(winnerIsCreator)
        .accounts({
          resolver: wallet.publicKey,
          referee: refereePubkey,
          creator: creatorPubkey,
          acceptor: acceptorPubkey,
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
      
      // Refresh wallet balance
      await connection.getBalance(wallet.publicKey, 'confirmed');
      
      // Trigger balance refresh in Header
      window.dispatchEvent(new Event('refreshBalance'));
      
      // Refresh bets and close popup
      await fetchMyBets();
      await fetchAcceptedBets();
      setIsBetModalOpen(false);
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

  const handleBetClick = (bet: MyBet) => {
    setSelectedBet(bet);
    setIsBetModalOpen(true);
  };

  const formatAddress = (address: string | null): string => {
    if (!address) return 'None';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatUserDisplay = (address: string | null, username: string | null | undefined): string => {
    if (!address) return 'None';
    const shortAddr = formatAddress(address);
    if (username) {
      return `${username} (${shortAddr})`;
    }
    return shortAddr;
  };

  const handleCreateBet = async () => {
    // Check if wallet is connected and has required methods
    if (!wallet.publicKey || !wallet.signTransaction || !connection) {
      alert('Wallet not properly connected. Please connect your wallet and try again.');
      return;
    }

    if (!betAmount || !description || !expiresAt) {
      alert('Please fill in all required fields.');
      return;
    }

    // Validate description length (max 128 bytes)
    const descriptionBytes = Buffer.from(description, 'utf8');
    if (descriptionBytes.length > 128) {
      alert('Description must be 128 bytes or less.');
      return;
    }

    // Validate and convert odds - must be positive integers
    const oddsWinNum = parseInt(oddsWin.trim(), 10);
    const oddsLoseNum = parseInt(oddsLose.trim(), 10);
    
    if (isNaN(oddsWinNum) || oddsWinNum <= 0 || !oddsWin.trim()) {
      alert(`Win odds must be a positive whole number (e.g., 1, 2, 3). Got: "${oddsWin}"`);
      return;
    }
    
    if (isNaN(oddsLoseNum) || oddsLoseNum <= 0 || !oddsLose.trim()) {
      alert(`Lose odds must be a positive whole number (e.g., 1, 2, 3). Got: "${oddsLose}"`);
      return;
    }

    try {
      setCreatingBet(true);

      // Convert bet amount to lamports - use anchor.BN (like tests do)
      const betAmountLamports = new anchor.BN(Math.floor(parseFloat(betAmount) * 1e9));
      const oddsWinBN = new anchor.BN(oddsWinNum);
      const oddsLoseBN = new anchor.BN(oddsLoseNum);
      const expiresAtTimestamp = new anchor.BN(Math.floor(new Date(expiresAt).getTime() / 1000));
      
      // Convert description to [u8; 128] array
      const descriptionBytes = Buffer.from(description, 'utf8');
      const descriptionArray = new Array(128).fill(0);
      for (let i = 0; i < Math.min(128, descriptionBytes.length); i++) {
        descriptionArray[i] = descriptionBytes[i];
      }

      // Debug: Log all values before sending
      console.log('=== WEB SIDE DEBUG ===');
      console.log('betAmount:', betAmount);
      console.log('betAmountLamports (BN):', betAmountLamports.toString());
      console.log('oddsWinBN:', oddsWinBN.toString());
      console.log('oddsLoseBN:', oddsLoseBN.toString());
      console.log('expiresAt:', expiresAt);
      console.log('expiresAtTimestamp (BN):', expiresAtTimestamp.toString());

      // Create client - pass full wallet context
      const client = new BetClient(wallet as any, connection);
      const program = client.getProgram();
      const provider = program.provider as any;

      // Find profile by searching all profiles and matching wallet
      // This is necessary since we need the username to derive the profile PDA
      let profileAccount = null;
      let profilePda: PublicKey | null = null;
      
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
            [profilePda] = await PublicKey.findProgramAddress(
              [Buffer.from('username-'), nameBuffer],
              PROGRAM_ID
            );
            break;
          }
        }
      } catch (error) {
        console.error('Error searching for profile:', error);
      }

      if (!profileAccount || !profilePda) {
        alert('Please create a profile first before creating bets.');
        setCreatingBet(false);
        return;
      }

      // Validate wallet matches
      if (profileAccount.wallet.toString() !== wallet.publicKey.toString()) {
        alert('Profile wallet mismatch. Please contact support.');
        setCreatingBet(false);
        return;
      }
      const betIndex = profileAccount.totalMyBetCount as number;

      // Calculate bet PDA
      const betIndexBuffer = Buffer.alloc(4);
      betIndexBuffer.writeUInt32LE(betIndex, 0);
      const [betPda] = await PublicKey.findProgramAddress(
        [Buffer.from('bet'), wallet.publicKey.toBuffer(), betIndexBuffer],
        PROGRAM_ID
      );

      // Calculate treasury PDA
      const [treasuryPda] = await PublicKey.findProgramAddress(
        [Buffer.from('bet-treasury-'), betPda.toBuffer()],
        PROGRAM_ID
      );

      // Determine referee based on referee type
      let refereePubkey: PublicKey;
      if (refereeType === 0) {
        // Honor System - referee is the creator
        refereePubkey = wallet.publicKey;
      } else if (refereeType === 2) {
        // Third Party - referee is the selected friend
        if (!selectedReferee) {
          alert('Please select a designated referee for Third Party bets.');
          setCreatingBet(false);
          return;
        }
        try {
          refereePubkey = new PublicKey(selectedReferee);
        } catch (error) {
          alert('Invalid referee wallet address.');
          setCreatingBet(false);
          return;
        }
      } else {
        alert('Only Honor System (0) and Third Party (2) referee types are allowed.');
        setCreatingBet(false);
        return;
      }

      // Call create_bet instruction using .rpc() - use BN objects (Anchor 0.28.0 requires BN)
      const tx = await program.methods
        .createBet(
          betAmountLamports,    // anchor.BN for u64
          Array.from(descriptionArray), // [u8; 128]
          refereeType,          // u8
          category,             // u8
          oddsWinBN,            // anchor.BN for u64
          oddsLoseBN,           // anchor.BN for u64
          expiresAtTimestamp    // anchor.BN for i64
        )
        .accounts({
          creator: wallet.publicKey,
          profile: profilePda,
          referee: refereePubkey,
          bet: betPda,
          treasury: treasuryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Create bet tx:', tx);
      
      // Wait for confirmation
      await connection.confirmTransaction(tx, 'confirmed');
      
      console.log('Bet created successfully! Transaction:', tx);
      
      // Refresh wallet balance
      await connection.getBalance(wallet.publicKey, 'confirmed');
      
      // Trigger balance refresh in Header
      window.dispatchEvent(new Event('refreshBalance'));
      
      // Close modal and reset form
      setIsModalOpen(false);
      setBetAmount('1');
      setDescription('');
      setRefereeType(0);
      setCategory(9);
      setOddsWin('3');
      setOddsLose('1');
      setExpiresAt('');
      
      // Refresh bets list
      await fetchMyBets();
      await fetchAcceptedBets();
      
      // Show success notification
      showNotification('Bet created successfully!', 'success');
    } catch (error: any) {
      console.error('Error creating bet:', error);
      const errorMessage = error.message || 'Please try again.';
      console.error(`Failed to create bet: ${errorMessage}`);
      showNotification(`Failed to create bet: ${errorMessage}`, 'error');
    } finally {
      setCreatingBet(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      {/* Notification Banner */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
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

      {/* Main Content */}
      <div 
        className="bet-scroll-container"
        style={{
          width: '100%',
          height: 'calc(100vh - 64px)',
          backgroundColor: '#1a1f35',
          padding: '40px',
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
          gap: '32px'
        }}>
          {/* My Bets Section */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#ffffff',
                margin: 0
              }}>
                My Bets
              </h2>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ff8c00',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff9500';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff8c00';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Make a Bet
              </button>
            </div>
            
            {loadingBets ? (
              <div style={{
                backgroundColor: '#0a0e1a',
                borderRadius: '16px',
                padding: '40px',
                border: '1px solid #2a2f45',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '18px',
                  color: '#888'
                }}>
                  Loading bets...
                </p>
              </div>
            ) : myBets.length === 0 ? (
            <div style={{
              backgroundColor: '#0a0e1a',
              borderRadius: '16px',
              padding: '40px',
              border: '1px solid #2a2f45',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '18px',
                color: '#888'
              }}>
                No bets yet. Create your first bet above!
              </p>
            </div>
            ) : (
              <div style={{
                backgroundColor: '#0a0e1a',
                borderRadius: '16px',
                border: '1px solid #2a2f45',
                overflow: 'hidden'
              }}>
                <div style={{
                  overflowX: 'auto'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: 0
                  }}>
                    <thead>
                      <tr style={{
                        backgroundColor: 'rgb(10, 14, 26)',
                        borderBottom: '2px solid #ff8c00'
                      }}>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Description</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Amount</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Odds</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Status</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>PNL</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Acceptor</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Category</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Referee</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myBets.map((bet, index) => (
                        <tr
                          key={bet.id}
                          onClick={() => handleBetClick(bet)}
                          style={{
                            borderBottom: index < myBets.length - 1 ? '1px solid #1e293b' : 'none',
                            transition: 'background-color 0.15s ease',
                            cursor: 'pointer',
                            backgroundColor: 'rgb(10, 14, 26)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgb(30, 45, 70)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgb(10, 14, 26)';
                          }}
                        >
                          <td style={{
                            padding: '16px',
                            color: '#e0e0e0',
                            fontSize: '14px',
                            borderRight: 'none',
                            maxWidth: '300px',
                            wordWrap: 'break-word'
                          }}>{bet.description || 'No description'}</td>
                          <td style={{
                            padding: '16px',
                            color: '#e0e0e0',
                            fontSize: '14px',
                            borderRight: 'none'
                          }}>{bet.amount.toFixed(4)} SOL</td>
                          <td style={{
                            padding: '16px',
                            color: '#ff8c00',
                            fontSize: '14px',
                            fontWeight: '600',
                            borderRight: 'none'
                          }}>{bet.ratio}</td>
                          <td style={{
                            padding: '16px',
                            borderRight: 'none'
                          }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '6px',
                              backgroundColor: bet.status === 3 && bet.winner && publicKey 
                                ? (bet.winner.toBase58() === publicKey.toBase58() ? '#4CAF50' : '#f44336')
                                : getStatusColor(bet.status, bet) + '20',
                              color: bet.status === 3 && bet.winner && publicKey
                                ? '#ffffff'
                                : getStatusColor(bet.status, bet),
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}>
                              {getStatusText(bet.status, bet)}
                            </span>
                          </td>
                          <td style={{
                            padding: '16px',
                            color: bet.status === 3 ? (calculatePNL(bet) >= 0 ? '#00d4aa' : '#ff6b6b') : '#888',
                            fontSize: '14px',
                            fontWeight: bet.status === 3 ? '600' : '400',
                            borderRight: 'none'
                          }}>
                            {bet.status === 3 ? `${calculatePNL(bet) >= 0 ? '+' : ''}${calculatePNL(bet).toFixed(2)} SOL` : '—'}
                          </td>
                          <td style={{
                            padding: '16px',
                            color: bet.acceptor ? '#e0e0e0' : '#888',
                            fontSize: '14px',
                            borderRight: 'none'
                          }}>{bet.acceptorUsername || bet.acceptor || 'None'}</td>
                          <td style={{
                            padding: '16px',
                            borderRight: 'none'
                          }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#1e3a5f',
                              border: '1px solid #2d4a6e',
                              color: '#ff8c00',
                              fontSize: '12px',
                              fontWeight: '500',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {getCategoryText(bet.category)}
                            </span>
                          </td>
                          <td style={{
                            padding: '16px',
                            color: '#b0b0b0',
                            fontSize: '14px',
                            borderRight: 'none'
                          }}>{getRefereeTypeText(bet.refereeType)}</td>
                          <td style={{
                            padding: '16px',
                            color: '#b0b0b0',
                            fontSize: '14px'
                          }}>
                            <ExpirationCountdown expiresAt={bet.expiresAt} status={bet.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* My Accepted Bets Section */}
          <div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#ffffff',
              margin: 0,
              marginBottom: '24px'
            }}>
              My Accepted Bets
            </h2>
            
            {loadingAcceptedBets ? (
              <div style={{
                backgroundColor: '#0a0e1a',
                borderRadius: '16px',
                padding: '40px',
                border: '1px solid #2a2f45',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '18px',
                  color: '#888'
                }}>
                  Loading accepted bets...
                </p>
              </div>
            ) : acceptedBets.length === 0 ? (
            <div style={{
              backgroundColor: '#0a0e1a',
              borderRadius: '16px',
              padding: '40px',
              border: '1px solid #2a2f45',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '18px',
                color: '#888'
              }}>
                No accepted bets yet.
              </p>
            </div>
            ) : (
              <div style={{
                backgroundColor: '#0a0e1a',
                borderRadius: '16px',
                border: '1px solid #2a2f45',
                overflow: 'hidden'
              }}>
                <div style={{
                  overflowX: 'auto'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: 0
                  }}>
                    <thead>
                      <tr style={{
                        backgroundColor: 'rgb(10, 14, 26)',
                        borderBottom: '2px solid #ff8c00'
                      }}>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Description</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Amount</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Odds</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Status</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>PNL</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Creator</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Category</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: 'none'
                        }}>Referee</th>
                        <th style={{
                          padding: '18px 16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acceptedBets.map((bet, index) => (
                        <tr
                          key={bet.id}
                          onClick={() => handleBetClick(bet)}
                          style={{
                            borderBottom: index < acceptedBets.length - 1 ? '1px solid #1e293b' : 'none',
                            transition: 'background-color 0.15s ease',
                            cursor: 'pointer',
                            backgroundColor: 'rgb(10, 14, 26)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgb(30, 45, 70)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgb(10, 14, 26)';
                          }}
                        >
                          <td style={{
                            padding: '16px',
                            color: '#e0e0e0',
                            fontSize: '14px',
                            borderRight: 'none',
                            maxWidth: '300px',
                            wordWrap: 'break-word'
                          }}>{bet.description || 'No description'}</td>
                          <td style={{
                            padding: '16px',
                            color: '#e0e0e0',
                            fontSize: '14px',
                            borderRight: 'none'
                          }}>{bet.amount.toFixed(4)} SOL</td>
                          <td style={{
                            padding: '16px',
                            color: '#ff8c00',
                            fontSize: '14px',
                            fontWeight: '600',
                            borderRight: 'none'
                          }}>{bet.ratio}</td>
                          <td style={{
                            padding: '16px',
                            borderRight: 'none'
                          }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '6px',
                              backgroundColor: bet.status === 3 && bet.winner && publicKey 
                                ? (bet.winner.toBase58() === publicKey.toBase58() ? '#4CAF50' : '#f44336')
                                : getStatusColor(bet.status, bet) + '20',
                              color: bet.status === 3 && bet.winner && publicKey
                                ? '#ffffff'
                                : getStatusColor(bet.status, bet),
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}>
                              {getStatusText(bet.status, bet)}
                            </span>
                          </td>
                          <td style={{
                            padding: '16px',
                            color: bet.status === 3 ? (calculatePNL(bet) >= 0 ? '#00d4aa' : '#ff6b6b') : '#888',
                            fontSize: '14px',
                            fontWeight: bet.status === 3 ? '600' : '400',
                            borderRight: 'none'
                          }}>
                            {bet.status === 3 ? `${calculatePNL(bet) >= 0 ? '+' : ''}${calculatePNL(bet).toFixed(2)} SOL` : '—'}
                          </td>
                          <td style={{
                            padding: '16px',
                            color: bet.creator ? '#e0e0e0' : '#888',
                            fontSize: '14px',
                            borderRight: 'none'
                          }}>{bet.creatorUsername || bet.creator || 'Unknown'}</td>
                          <td style={{
                            padding: '16px',
                            borderRight: 'none'
                          }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#1e3a5f',
                              border: '1px solid #2d4a6e',
                              color: '#ff8c00',
                              fontSize: '12px',
                              fontWeight: '500',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {getCategoryText(bet.category)}
                            </span>
                          </td>
                          <td style={{
                            padding: '16px',
                            color: '#b0b0b0',
                            fontSize: '14px',
                            borderRight: 'none'
                          }}>{getRefereeTypeText(bet.refereeType)}</td>
                          <td style={{
                            padding: '16px',
                            color: '#b0b0b0',
                            fontSize: '14px'
                          }}>
                            <ExpirationCountdown expiresAt={bet.expiresAt} status={bet.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Make a Bet Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#0a0e1a',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid #2a2f45',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#1a1f35',
                color: '#ffffff',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2a2f45';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1a1f35';
              }}
            >
              ×
            </button>

            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '24px',
              marginRight: '40px'
            }}>
              Make a Bet
            </h2>

            {/* Bet Amount and Category */}
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '24px',
              flexWrap: 'nowrap'
            }}>
              <div style={{
                flex: '1 1 50%',
                minWidth: '0'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '12px'
                }}>
                  Bet Amount
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  minWidth: '0'
                }}>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    style={{
                      flex: '1 1 auto',
                      minWidth: '0',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #2a2f45',
                      backgroundColor: '#1a1f35',
                      color: '#ffffff',
                      fontSize: '16px',
                      fontFamily: 'inherit'
                    }}
                  />
                  <span style={{
                    fontSize: '16px',
                    color: '#ffffff',
                    flexShrink: 0
                  }}>
                    SOL
                </span>
                </div>
              </div>

              <div style={{
                flex: '1 1 50%',
                minWidth: '0'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '12px'
                }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#1a1f35',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  <option value={0}>Sports</option>
                  <option value={1}>Personal Growth</option>
                  <option value={2}>Politics</option>
                  <option value={3}>Crypto</option>
                  <option value={4}>World Events</option>
                  <option value={5}>Entertainment</option>
                  <option value={6}>Technology</option>
                  <option value={7}>Business</option>
                  <option value={8}>Weather</option>
                  <option value={9}>Other</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={{
              marginBottom: '6px'
            }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '12px'
              }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={128}
                placeholder="Enter bet description (max 128 characters)"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #2a2f45',
                  backgroundColor: '#1a1f35',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
              />
              <div style={{
                fontSize: '12px',
                color: '#888',
                marginTop: '4px',
                textAlign: 'right'
              }}>
                {description.length}/128
              </div>
            </div>

            {/* Referee Type and Designated Referee */}
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '24px',
              flexWrap: 'nowrap'
            }}>
              <div style={{
                flex: '0 0 50%',
                minWidth: '0'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '12px'
                }}>
                  Referee Type
                </label>
                <select
                  value={refereeType}
                  onChange={(e) => {
                    setRefereeType(parseInt(e.target.value, 10));
                    if (parseInt(e.target.value, 10) !== 2) {
                      setSelectedReferee(''); // Clear selected referee if not Third Party
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#1a1f35',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  <option value={0}>Honor System</option>
                  <option value={2}>Third Party</option>
                </select>
              </div>

              {/* Designated Referee (only shown when Third Party is selected) */}
              {refereeType === 2 && (
                <div style={{
                  flex: '0 0 50%',
                  minWidth: '0'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#ffffff',
                    marginBottom: '12px'
                  }}>
                    Designated Referee
                  </label>
                  {friends.length === 0 ? (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #2a2f45',
                      backgroundColor: '#1a1f35',
                      color: '#888',
                      fontSize: '16px',
                      textAlign: 'center'
                    }}>
                      No friends added
                    </div>
                  ) : (
                    <select
                      value={selectedReferee}
                      onChange={(e) => setSelectedReferee(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #2a2f45',
                        backgroundColor: '#1a1f35',
                        color: '#ffffff',
                        fontSize: '16px',
                        fontFamily: 'inherit',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Select a friend...</option>
                      {friends.map((friend, index) => (
                        <option key={index} value={friend.wallet}>{friend.username}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Odds Section */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <label style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffffff',
                  margin: 0
                }}>
                  Bet Odds
                </label>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap'
              }}>
                <input
                  type="number"
                  value={oddsWin}
                  onChange={(e) => setOddsWin(e.target.value)}
                  min="1"
                  step="1"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#1a1f35',
                    color: '#ffffff',
                    fontSize: '16px',
                    width: '80px',
                    textAlign: 'center',
                    fontFamily: 'inherit'
                  }}
                />
                <span style={{
                  fontSize: '18px',
                  color: '#ffffff',
                  fontWeight: 'bold'
                }}>
                  :
                </span>
                <input
                  type="number"
                  value={oddsLose}
                  onChange={(e) => setOddsLose(e.target.value)}
                  min="1"
                  step="1"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#1a1f35',
                    color: '#ffffff',
                    fontSize: '16px',
                    width: '80px',
                    textAlign: 'center',
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  onClick={() => {
                    const temp = oddsWin;
                    setOddsWin(oddsLose);
                    setOddsLose(temp);
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#1a1f35',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    width: '36px',
                    height: '36px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2a2f45';
                    e.currentTarget.style.borderColor = '#ff8c00';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a1f35';
                    e.currentTarget.style.borderColor = '#2a2f45';
                  }}
                  title="Switch odds"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#1a1f35',
                border: '1px solid #2a2f45'
              }}>
                <p style={{
                  fontSize: '14px',
                  color: '#888',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  If you win you profit <span style={{ color: '#ff8c00', fontWeight: 'bold' }}>{payouts.yourProfit} SOL</span> if you lose they win <span style={{ color: '#ff8c00', fontWeight: 'bold' }}>{payouts.theirWin} SOL</span>
                </p>
              </div>
            </div>

            {/* Expires At Section */}
            <div style={{
              marginTop: '24px'
            }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '12px'
              }}>
                Expires At
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '16px'
              }}>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2a2f45',
                    backgroundColor: '#1a1f35',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    flex: 1,
                    minWidth: '200px'
                  }}
                />
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    onClick={() => setExpirationDate(1)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #2a2f45',
                      backgroundColor: '#1a1f35',
                      color: '#ffffff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2f45';
                      e.currentTarget.style.borderColor = '#ff8c00';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1a1f35';
                      e.currentTarget.style.borderColor = '#2a2f45';
                    }}
                  >
                    +1 day
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpirationDate(7)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #2a2f45',
                      backgroundColor: '#1a1f35',
                      color: '#ffffff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2f45';
                      e.currentTarget.style.borderColor = '#ff8c00';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1a1f35';
                      e.currentTarget.style.borderColor = '#2a2f45';
                    }}
                  >
                    +1 week
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpirationDate(30)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #2a2f45',
                      backgroundColor: '#1a1f35',
                      color: '#ffffff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2f45';
                      e.currentTarget.style.borderColor = '#ff8c00';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1a1f35';
                      e.currentTarget.style.borderColor = '#2a2f45';
                    }}
                  >
                    +1 month
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{
              marginTop: '32px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setIsModalOpen(false)}
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
                Cancel
              </button>
              <button
                onClick={handleCreateBet}
                disabled={creatingBet || !betAmount || !description || !expiresAt || (refereeType === 2 && (friends.length === 0 || !selectedReferee))}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: creatingBet || !betAmount || !description || !expiresAt || (refereeType === 2 && (friends.length === 0 || !selectedReferee)) ? '#666' : '#ff8c00',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: creatingBet || !betAmount || !expiresAt ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (!creatingBet && betAmount && description && expiresAt && !(refereeType === 2 && (friends.length === 0 || !selectedReferee))) {
                    e.currentTarget.style.backgroundColor = '#ff9500';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creatingBet && betAmount && description && expiresAt && !(refereeType === 2 && (friends.length === 0 || !selectedReferee))) {
                    e.currentTarget.style.backgroundColor = '#ff8c00';
                  }
                }}
              >
                {creatingBet ? 'Creating...' : 'Create Bet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bet Details Modal */}
      {selectedBet && (
        <BetDetailsModal
          isOpen={isBetModalOpen}
          onClose={() => setIsBetModalOpen(false)}
          description={selectedBet.description}
          amount={selectedBet.amount}
          ratio={selectedBet.ratio}
          status={selectedBet.status}
          expiresAt={selectedBet.expiresAt}
          createdAt={selectedBet.createdAt}
          category={selectedBet.category}
          refereeType={selectedBet.refereeType}
          creatorDisplay={selectedBet.creator 
            ? formatUserDisplay(selectedBet.creator, selectedBet.creatorUsername)
            : (publicKey ? formatUserDisplay(publicKey.toBase58(), null) : 'You')}
          creatorPublicKey={selectedBet.creatorPubkey || publicKey || null}
          acceptorDisplay={selectedBet.acceptor 
            ? formatUserDisplay(selectedBet.acceptor, selectedBet.acceptorUsername)
            : null}
          statusText={getStatusText(selectedBet.status, selectedBet)}
          statusColor={getStatusColor(selectedBet.status, selectedBet)}
          categoryText={getCategoryText(selectedBet.category)}
          refereeTypeText={getRefereeTypeText(selectedBet.refereeType)}
          refereeUsername={selectedBet.refereeType === 2 ? selectedBet.refereeUsername : null}
          pnl={selectedBet.status === 3 ? calculatePNL(selectedBet) : null}
          oddsWin={selectedBet.oddsWin}
          oddsLose={selectedBet.oddsLose}
          winner={selectedBet.winner}
          showActions={true}
          onCancelBet={() => handleCancelBet(selectedBet)}
          cancellingBet={cancellingBet}
          isCreator={!selectedBet.creator} // If creator field doesn't exist, user is the creator
          currentUserPublicKey={publicKey}
          showResolveButtons={selectedBet.status === 1 && 
            publicKey &&
            (
              // Honor System: Only creator can resolve (after expiration)
              (selectedBet.refereeType === 0 && 
               !selectedBet.creator && // Only show for "My Bets" (user is creator)
               Math.floor(Date.now() / 1000) > selectedBet.expiresAt) ||
              // Third Party: Only referee can resolve
              (selectedBet.refereeType === 2 && 
               selectedBet.referee &&
               publicKey.toBase58() === selectedBet.referee.toBase58())
            )}
          onResolveBet={(winnerIsCreator) => handleResolveBet(selectedBet, winnerIsCreator)}
          resolvingBet={resolvingBet}
          canResolve={selectedBet.status === 1 && 
            publicKey &&
            (
              // Honor System: Only creator can resolve (after expiration)
              (selectedBet.refereeType === 0 && 
               !selectedBet.creator && // Only for "My Bets" (user is creator)
               Math.floor(Date.now() / 1000) > selectedBet.expiresAt) ||
              // Third Party: Only referee can resolve
              (selectedBet.refereeType === 2 && 
               selectedBet.referee &&
               publicKey.toBase58() === selectedBet.referee.toBase58())
            )}
        />
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

export default MyBets;
