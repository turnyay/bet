import { Program, AnchorProvider, Wallet as AnchorWallet, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Program ID from lib.rs
export const PROGRAM_ID = new PublicKey('8a6kHAGhMgMEJnhDEafuZf1JYc4a9rdWySJNQ311UhHD');

// IDL copied from target/idl/bet.json - converted to match solcity format
export const IDL: Idl = {
  version: '0.1.0',
  name: 'bet',
  instructions: [
    {
      name: 'acceptBet',
      accounts: [
        { name: 'acceptor', isMut: true, isSigner: true },
        { name: 'creator', isMut: false, isSigner: false },
        { name: 'acceptor_profile', isMut: true, isSigner: false },
        { name: 'bet', isMut: true, isSigner: false },
        { name: 'system_program', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'cancelBet',
      accounts: [
        { name: 'creator', isMut: true, isSigner: true },
        { name: 'profile', isMut: true, isSigner: false },
        { name: 'bet', isMut: true, isSigner: false },
        { name: 'system_program', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'createBet',
      accounts: [
        { name: 'creator', isMut: true, isSigner: true },
        { name: 'profile', isMut: true, isSigner: false },
        { name: 'bet', isMut: true, isSigner: false },
        { name: 'system_program', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'description', type: { array: ['u8', 256] } },
        { name: 'bet_amount', type: 'u64' },
        { name: 'referee_type', type: 'u8' },
        { name: 'odds_win', type: 'u64' },
        { name: 'odds_lose', type: 'u64' },
        { name: 'expires_at', type: 'i64' },
      ],
    },
    {
      name: 'createProfile',
      accounts: [
        { name: 'wallet', isMut: true, isSigner: true },
        { name: 'profile', isMut: true, isSigner: false },
        { name: 'system_program', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'name', type: { array: ['u8', 32] } },
      ],
    },
    {
      name: 'resolveBet',
      accounts: [
        { name: 'resolver', isMut: true, isSigner: true },
        { name: 'creator', isMut: false, isSigner: false },
        { name: 'acceptor', isMut: false, isSigner: false },
        { name: 'creator_profile', isMut: true, isSigner: false },
        { name: 'acceptor_profile', isMut: true, isSigner: false },
        { name: 'bet', isMut: true, isSigner: false },
        { name: 'system_program', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'winner_is_creator', type: 'bool' },
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
          { name: 'bet_amount', type: 'u64' },
          { name: 'description', type: { array: ['u8', 256] } },
          { name: 'referee_type', type: 'u8' },
          { name: 'odds_win', type: 'u64' },
          { name: 'odds_lose', type: 'u64' },
          { name: 'expires_at', type: 'i64' },
          { name: 'status', type: 'u8' },
          { name: 'winner', type: { option: 'publicKey' } },
          { name: 'created_at', type: 'i64' },
          { name: 'accepted_at', type: { option: 'i64' } },
          { name: 'resolved_at', type: { option: 'i64' } },
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
          { name: 'total_my_bet_count', type: 'u32' },
          { name: 'total_bets_accepted_count', type: 'u32' },
          { name: 'total_my_bet_wins', type: 'u32' },
          { name: 'total_my_bet_losses', type: 'u32' },
          { name: 'total_accepted_bet_wins', type: 'u32' },
          { name: 'total_accepted_bet_losses', type: 'u32' },
          { name: 'total_profit', type: 'i64' },
          { name: 'created_at', type: 'i64' },
          { name: 'version', type: 'u8' },
          { name: 'bump', type: 'u8' },
          { name: '_padding', type: { array: ['u8', 7] } },
        ],
      },
    },
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
    this.program = new Program(IDL, this.programId, this.provider);
  }

  getProgram(): Program<Idl> {
    return this.program;
  }
}
