import { Program, AnchorProvider, Wallet as AnchorWallet, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Program ID from lib.rs
export const PROGRAM_ID = new PublicKey('8a6kHAGhMgMEJnhDEafuZf1JYc4a9rdWySJNQ311UhHD');

// Hardcoded IDL (like solcity) - converted from bet.json
// Anchor 0.28.0 format: publicKey (not pubkey), isMut/isSigner (not writable/signer)
export const IDL: Idl = {
  version: '0.1.0',
  name: 'bet',
  instructions: [
    {
      name: 'acceptBet',
      accounts: [
        { name: 'acceptor', isMut: true, isSigner: true },
        { name: 'creator', isMut: false, isSigner: false },
        { name: 'acceptorProfile', isMut: true, isSigner: false },
        { name: 'bet', isMut: true, isSigner: false },
        { name: 'treasury', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'cancelBet',
      accounts: [
        { name: 'creator', isMut: true, isSigner: true },
        { name: 'profile', isMut: true, isSigner: false },
        { name: 'bet', isMut: true, isSigner: false },
        { name: 'treasury', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'createBet',
      accounts: [
        { name: 'creator', isMut: true, isSigner: true },
        { name: 'profile', isMut: true, isSigner: false },
        { name: 'bet', isMut: true, isSigner: false },
        { name: 'treasury', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'betAmount', type: 'u64' },
          { name: 'description', type: { array: ['u8', 128] } },
          { name: 'refereeType', type: 'u8' },
          { name: 'category', type: 'u8' },
        { name: 'oddsWin', type: 'u64' },
        { name: 'oddsLose', type: 'u64' },
        { name: 'expiresAt', type: 'i64' },
      ],
    },
    {
      name: 'createProfile',
      accounts: [
        { name: 'wallet', isMut: true, isSigner: true },
        { name: 'profile', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'name', type: { array: ['u8', 32] } },
      ],
    },
    {
      name: 'resolveBet',
      accounts: [
        { name: 'resolver', isMut: true, isSigner: true },
        { name: 'creator', isMut: true, isSigner: false },
        { name: 'acceptor', isMut: true, isSigner: false },
        { name: 'creatorProfile', isMut: true, isSigner: false },
        { name: 'acceptorProfile', isMut: true, isSigner: false },
        { name: 'bet', isMut: true, isSigner: false },
        { name: 'treasury', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'winnerIsCreator', type: 'bool' },
      ],
    },
  ],
  accounts: [
    {
      name: 'Bet',
      type: {
        kind: 'struct',
        fields: [
          { name: 'creator', type: 'publicKey' },
          { name: 'acceptor', type: { option: 'publicKey' } },
          { name: 'betAmount', type: 'u64' },
          { name: 'description', type: { array: ['u8', 128] } },
          { name: 'refereeType', type: 'u8' },
          { name: 'category', type: 'u8' },
          { name: 'oddsWin', type: 'u64' },
          { name: 'oddsLose', type: 'u64' },
          { name: 'expiresAt', type: 'i64' },
          { name: 'status', type: 'u8' },
          { name: 'winner', type: { option: 'publicKey' } },
          { name: 'createdAt', type: 'i64' },
          { name: 'acceptedAt', type: { option: 'i64' } },
          { name: 'resolvedAt', type: { option: 'i64' } },
          { name: 'version', type: 'u8' },
          { name: 'bump', type: 'u8' },
          { name: '_padding', type: { array: ['u8', 6] } },
        ],
      },
    },
    {
      name: 'Profile',
      type: {
        kind: 'struct',
        fields: [
          { name: 'wallet', type: 'publicKey' },
          { name: 'name', type: { array: ['u8', 32] } },
          { name: 'totalMyBetCount', type: 'u32' },
          { name: 'totalBetsAcceptedCount', type: 'u32' },
          { name: 'totalMyBetWins', type: 'u32' },
          { name: 'totalMyBetLosses', type: 'u32' },
          { name: 'totalAcceptedBetWins', type: 'u32' },
          { name: 'totalAcceptedBetLosses', type: 'u32' },
          { name: 'totalMyBetProfit', type: 'i64' },
          { name: 'totalAcceptedBetProfit', type: 'i64' },
          { name: 'createdAt', type: 'i64' },
          { name: 'version', type: 'u8' },
          { name: 'bump', type: 'u8' },
          { name: '_padding', type: { array: ['u8', 7] } },
        ],
      },
    },
  ],
  types: [],
  errors: [
    { code: 6000, name: 'InvalidRefereeType', msg: 'Invalid referee type.' },
    { code: 6001, name: 'InvalidOdds', msg: 'Invalid odds. Both values must be greater than 0.' },
    { code: 6002, name: 'InvalidExpiration', msg: 'Invalid expiration time. Must be in the future.' },
    { code: 6003, name: 'Unauthorized', msg: 'Unauthorized action.' },
    { code: 6004, name: 'InvalidBetStatus', msg: 'Invalid bet status for this operation.' },
    { code: 6005, name: 'BetExpired', msg: 'Bet has expired.' },
    { code: 6006, name: 'BetAlreadyAccepted', msg: 'Bet has already been accepted.' },
    { code: 6007, name: 'CannotAcceptOwnBet', msg: 'Cannot accept your own bet.' },
    { code: 6008, name: 'InvalidBetCreator', msg: 'Invalid bet creator.' },
    { code: 6009, name: 'BetNotAccepted', msg: 'Bet has not been accepted yet.' },
    { code: 6010, name: 'ArithmeticOverflow', msg: 'Arithmetic overflow occurred.' },
  ],
  metadata: {
    address: PROGRAM_ID.toString(),
  },
};

export class BetClient {
  public program: Program<Idl>;
  private connection: Connection;
  private provider?: AnchorProvider;
  private programId: PublicKey;
  private walletContext: WalletContextState;

  constructor(
    walletContext: WalletContextState,
    connection: Connection
  ) {
    this.connection = connection;
    
    if (!walletContext.publicKey || !walletContext.signTransaction) {
      throw new Error('Wallet not connected or missing required methods');
    }

    this.walletContext = walletContext;

    const anchorWallet = {
      publicKey: walletContext.publicKey,
      signTransaction: walletContext.signTransaction,
      signAllTransactions: walletContext.signAllTransactions || (async (txs) => txs),
    };
    
    this.provider = new AnchorProvider(this.connection, anchorWallet as AnchorWallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
    
    this.programId = PROGRAM_ID;
    
    try {
      this.program = new Program(IDL, this.programId, this.provider);
    } catch (error: any) {
      console.error('Error creating Program with IDL:', error);
      throw new Error(`Failed to initialize program: ${error.message}`);
    }
  }

  getProgram(): Program<Idl> {
    return this.program;
  }
}
