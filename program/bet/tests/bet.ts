import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Bet } from "../target/types/bet";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { expect } from "chai";
import { Buffer } from "buffer";

// Program ID from lib.rs
const PROGRAM_ID = new PublicKey("8a6kHAGhMgMEJnhDEafuZf1JYc4a9rdWySJNQ311UhHD");

describe("bet", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.bet as Program<Bet>;
  const provider = anchor.getProvider();

  // Test accounts
  const creator = Keypair.generate();
  const acceptor = Keypair.generate();

  // PDAs
  let creatorProfilePDA: PublicKey;
  let acceptorProfilePDA: PublicKey;
  let betPDA: PublicKey;

  before(async () => {
    try {
      // Airdrop SOL to test accounts
      const airdropAmount = 2 * anchor.web3.LAMPORTS_PER_SOL;
      const airdropPromises = [
        provider.connection.requestAirdrop(creator.publicKey, airdropAmount),
        provider.connection.requestAirdrop(acceptor.publicKey, airdropAmount),
      ];
      await Promise.all(airdropPromises);

      // Wait for airdrops to confirm
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Find PDAs
      [creatorProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile-"), creator.publicKey.toBuffer()],
        PROGRAM_ID
      );

      [acceptorProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile-"), acceptor.publicKey.toBuffer()],
        PROGRAM_ID
      );
    } catch (error) {
      console.error("Error in before hook:", error);
      throw error;
    }
  });

  it("Create Creator Profile", async () => {
    try {
      // Create name buffer (32 bytes)
      const name = Buffer.alloc(32);
      const profileName = "Creator";
      Buffer.from(profileName).copy(name);

      const tx = await program.methods
        .createProfile(Array.from(name))
        .accounts({
          wallet: creator.publicKey,
          profile: creatorProfilePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      console.log("Create Creator Profile tx:", tx);

      // Wait for transaction to be confirmed
      await provider.connection.confirmTransaction(tx);

      // Verify profile account
      const profile = await program.account.profile.fetch(creatorProfilePDA);
      expect(profile.wallet.toBase58()).to.equal(creator.publicKey.toBase58());
      expect(Buffer.from(profile.name).toString().replace(/\0/g, '')).to.equal("Creator");
      expect(profile.totalMyBetCount).to.equal(0);
      expect(profile.totalBetsAcceptedCount).to.equal(0);
      expect(profile.totalMyBetWins).to.equal(0);
      expect(profile.totalMyBetLosses).to.equal(0);
      expect(profile.totalAcceptedBetWins).to.equal(0);
      expect(profile.totalAcceptedBetLosses).to.equal(0);
      expect(profile.totalProfit.toNumber()).to.equal(0); // i64 is BN
      expect(profile.createdAt.toNumber()).to.be.greaterThan(0); // i64 is BN
      expect(profile.version).to.equal(1);
    } catch (error) {
      console.error("Error creating creator profile:", error);
      throw error;
    }
  });

  it("Create Acceptor Profile", async () => {
    try {
      // Create name buffer (32 bytes)
      const name = Buffer.alloc(32);
      const profileName = "Acceptor";
      Buffer.from(profileName).copy(name);

      const tx = await program.methods
        .createProfile(Array.from(name))
        .accounts({
          wallet: acceptor.publicKey,
          profile: acceptorProfilePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([acceptor])
        .rpc();

      console.log("Create Acceptor Profile tx:", tx);

      // Wait for transaction to be confirmed
      await provider.connection.confirmTransaction(tx);

      // Verify profile account
      const profile = await program.account.profile.fetch(acceptorProfilePDA);
      expect(profile.wallet.toBase58()).to.equal(acceptor.publicKey.toBase58());
      expect(Buffer.from(profile.name).toString().replace(/\0/g, '')).to.equal("Acceptor");
      expect(profile.totalMyBetCount).to.equal(0);
      expect(profile.totalBetsAcceptedCount).to.equal(0);
    } catch (error) {
      console.error("Error creating acceptor profile:", error);
      throw error;
    }
  });

  it("Create Bet", async () => {
    try {
      // Get current bet count to calculate PDA
      const creatorProfile = await program.account.profile.fetch(creatorProfilePDA);
      const betIndex = creatorProfile.totalMyBetCount;

      // Create description buffer (256 bytes)
      const description = Buffer.alloc(256);
      const betDescription = "I will go to the gym every day for 7 days";
      Buffer.from(betDescription).copy(description);

      // Calculate bet PDA
      const betIndexBuffer = Buffer.alloc(4);
      betIndexBuffer.writeUInt32LE(betIndex, 0);
      [betPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), creator.publicKey.toBuffer(), betIndexBuffer],
        PROGRAM_ID
      );

      // Set bet parameters
      const betAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL); // 1 SOL
      const refereeType = 0; // Honor System
      const oddsWin = new anchor.BN(3);
      const oddsLose = new anchor.BN(1);
      const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 1 day from now

      const tx = await program.methods
        .createBet(
          Array.from(description),
          betAmount,
          refereeType,
          oddsWin,
          oddsLose,
          expiresAt
        )
        .accounts({
          creator: creator.publicKey,
          profile: creatorProfilePDA,
          bet: betPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      console.log("Create Bet tx:", tx);

      // Wait for transaction to be confirmed
      await provider.connection.confirmTransaction(tx);

      // Verify bet account
      const bet = await program.account.bet.fetch(betPDA);
      expect(bet.creator.toBase58()).to.equal(creator.publicKey.toBase58());
      expect(bet.acceptor).to.be.null;
      expect(bet.betAmount.toNumber()).to.equal(betAmount.toNumber());
      expect(Buffer.from(bet.description).toString().replace(/\0/g, '')).to.equal(betDescription);
      expect(bet.refereeType).to.equal(refereeType);
      expect(bet.oddsWin.toNumber()).to.equal(3);
      expect(bet.oddsLose.toNumber()).to.equal(1);
      expect(bet.expiresAt.toNumber()).to.equal(expiresAt.toNumber());
      expect(bet.status).to.equal(0); // Open
      expect(bet.winner).to.be.null;
      expect(bet.createdAt.toNumber()).to.be.greaterThan(0);
      expect(bet.acceptedAt).to.be.null;
      expect(bet.resolvedAt).to.be.null;
      expect(bet.version).to.equal(1);

      // Verify creator profile bet count was incremented
      const updatedProfile = await program.account.profile.fetch(creatorProfilePDA);
      expect(updatedProfile.totalMyBetCount).to.equal(1);
    } catch (error) {
      console.error("Error creating bet:", error);
      throw error;
    }
  });

  it("Accept Bet", async () => {
    try {
      const tx = await program.methods
        .acceptBet()
        .accounts({
          acceptor: acceptor.publicKey,
          creator: creator.publicKey,
          acceptorProfile: acceptorProfilePDA,
          bet: betPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([acceptor])
        .rpc();

      console.log("Accept Bet tx:", tx);

      // Wait for transaction to be confirmed
      await provider.connection.confirmTransaction(tx);

      // Verify bet account was updated
      const bet = await program.account.bet.fetch(betPDA);
      expect(bet.acceptor).to.not.be.null;
      if (bet.acceptor) {
        expect(bet.acceptor.toBase58()).to.equal(acceptor.publicKey.toBase58());
      }
      expect(bet.status).to.equal(1); // Accepted
      expect(bet.acceptedAt).to.not.be.null;
      if (bet.acceptedAt) {
        expect(bet.acceptedAt.toNumber()).to.be.greaterThan(0);
      }

      // Verify acceptor profile accepted count was incremented
      const acceptorProfile = await program.account.profile.fetch(acceptorProfilePDA);
      expect(acceptorProfile.totalBetsAcceptedCount).to.equal(1);
    } catch (error) {
      console.error("Error accepting bet:", error);
      throw error;
    }
  });

  it("Resolve Bet - Creator Wins", async () => {
    try {
      const winnerIsCreator = true;

      const tx = await program.methods
        .resolveBet(winnerIsCreator)
        .accounts({
          resolver: creator.publicKey,
          creator: creator.publicKey,
          acceptor: acceptor.publicKey,
          creatorProfile: creatorProfilePDA,
          acceptorProfile: acceptorProfilePDA,
          bet: betPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      console.log("Resolve Bet (Creator Wins) tx:", tx);

      // Wait for transaction to be confirmed
      await provider.connection.confirmTransaction(tx);

      // Verify bet account was updated
      const bet = await program.account.bet.fetch(betPDA);
      expect(bet.status).to.equal(3); // Resolved
      expect(bet.winner).to.not.be.null;
      if (bet.winner) {
        expect(bet.winner.toBase58()).to.equal(creator.publicKey.toBase58());
      }
      expect(bet.resolvedAt).to.not.be.null;
      if (bet.resolvedAt) {
        expect(bet.resolvedAt.toNumber()).to.be.greaterThan(0);
      }

      // Calculate expected profit: bet_amount * odds_win / odds_lose = 1 SOL * 3 / 1 = 3 SOL
      const expectedProfit = new anchor.BN(3 * anchor.web3.LAMPORTS_PER_SOL);

      // Verify creator profile stats
      const creatorProfile = await program.account.profile.fetch(creatorProfilePDA);
      expect(creatorProfile.totalMyBetWins).to.equal(1);
      expect(creatorProfile.totalMyBetLosses).to.equal(0);
      expect(creatorProfile.totalProfit.toNumber()).to.equal(expectedProfit.toNumber());

      // Verify acceptor profile stats
      const acceptorProfile = await program.account.profile.fetch(acceptorProfilePDA);
      expect(acceptorProfile.totalAcceptedBetWins).to.equal(0);
      expect(acceptorProfile.totalAcceptedBetLosses).to.equal(1);
      // Acceptor loses their bet amount (1 SOL)
      expect(acceptorProfile.totalProfit.toNumber()).to.equal(-1 * anchor.web3.LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Error resolving bet:", error);
      throw error;
    }
  });

  it("Create Second Bet and Cancel It", async () => {
    try {
      // Get current bet count
      const creatorProfile = await program.account.profile.fetch(creatorProfilePDA);
      const betIndex = creatorProfile.totalMyBetCount;

      // Create description buffer
      const description = Buffer.alloc(256);
      const betDescription = "This bet will be cancelled";
      Buffer.from(betDescription).copy(description);

      // Calculate bet PDA
      const betIndexBuffer = Buffer.alloc(4);
      betIndexBuffer.writeUInt32LE(betIndex, 0);
      const [cancelBetPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), creator.publicKey.toBuffer(), betIndexBuffer],
        PROGRAM_ID
      );

      // Set bet parameters
      const betAmount = new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL);
      const refereeType = 0;
      const oddsWin = new anchor.BN(2);
      const oddsLose = new anchor.BN(1);
      const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

      // Create the bet
      const createTx = await program.methods
        .createBet(
          Array.from(description),
          betAmount,
          refereeType,
          oddsWin,
          oddsLose,
          expiresAt
        )
        .accounts({
          creator: creator.publicKey,
          profile: creatorProfilePDA,
          bet: cancelBetPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      console.log("Create Second Bet tx:", createTx);
      await provider.connection.confirmTransaction(createTx);

      // Verify bet count increased
      let updatedProfile = await program.account.profile.fetch(creatorProfilePDA);
      expect(updatedProfile.totalMyBetCount).to.equal(2);

      // Cancel the bet
      const cancelTx = await program.methods
        .cancelBet()
        .accounts({
          creator: creator.publicKey,
          profile: creatorProfilePDA,
          bet: cancelBetPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      console.log("Cancel Bet tx:", cancelTx);
      await provider.connection.confirmTransaction(cancelTx);

      // Verify bet was cancelled
      const cancelledBet = await program.account.bet.fetch(cancelBetPDA);
      expect(cancelledBet.status).to.equal(2); // Cancelled

      // Verify bet count was decremented
      updatedProfile = await program.account.profile.fetch(creatorProfilePDA);
      expect(updatedProfile.totalMyBetCount).to.equal(1);
    } catch (error) {
      console.error("Error creating and cancelling bet:", error);
      throw error;
    }
  });

  it("Create and Resolve Bet - Acceptor Wins", async () => {
    try {
      // Get current bet count
      const creatorProfile = await program.account.profile.fetch(creatorProfilePDA);
      const betIndex = creatorProfile.totalMyBetCount;

      // Create description buffer
      const description = Buffer.alloc(256);
      const betDescription = "Acceptor will win this bet";
      Buffer.from(betDescription).copy(description);

      // Calculate bet PDA
      const betIndexBuffer = Buffer.alloc(4);
      betIndexBuffer.writeUInt32LE(betIndex, 0);
      const [newBetPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), creator.publicKey.toBuffer(), betIndexBuffer],
        PROGRAM_ID
      );

      // Set bet parameters
      const betAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
      const refereeType = 0;
      const oddsWin = new anchor.BN(1);
      const oddsLose = new anchor.BN(3); // 1:3 odds
      const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

      // Create the bet
      const createTx = await program.methods
        .createBet(
          Array.from(description),
          betAmount,
          refereeType,
          oddsWin,
          oddsLose,
          expiresAt
        )
        .accounts({
          creator: creator.publicKey,
          profile: creatorProfilePDA,
          bet: newBetPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      await provider.connection.confirmTransaction(createTx);

      // Accept the bet
      const acceptTx = await program.methods
        .acceptBet()
        .accounts({
          acceptor: acceptor.publicKey,
          creator: creator.publicKey,
          acceptorProfile: acceptorProfilePDA,
          bet: newBetPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([acceptor])
        .rpc();

      await provider.connection.confirmTransaction(acceptTx);

      // Resolve with acceptor winning
      const resolveTx = await program.methods
        .resolveBet(false) // winner_is_creator = false
        .accounts({
          resolver: creator.publicKey,
          creator: creator.publicKey,
          acceptor: acceptor.publicKey,
          creatorProfile: creatorProfilePDA,
          acceptorProfile: acceptorProfilePDA,
          bet: newBetPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      await provider.connection.confirmTransaction(resolveTx);

      // Verify bet was resolved
      const resolvedBet = await program.account.bet.fetch(newBetPDA);
      expect(resolvedBet.status).to.equal(3); // Resolved
      if (resolvedBet.winner) {
        expect(resolvedBet.winner.toBase58()).to.equal(acceptor.publicKey.toBase58());
      }

      // Calculate expected profit: bet_amount * odds_win / odds_lose = 1 SOL * 1 / 3 = 0.333... SOL
      const expectedProfit = new anchor.BN(Math.floor(anchor.web3.LAMPORTS_PER_SOL / 3));

      // Verify acceptor profile stats
      const acceptorProfile = await program.account.profile.fetch(acceptorProfilePDA);
      expect(acceptorProfile.totalAcceptedBetWins).to.equal(1);
      expect(acceptorProfile.totalAcceptedBetLosses).to.equal(1); // From previous test
      // Acceptor profit: previous loss (-1 SOL) + current win (0.333 SOL) = -0.666... SOL
      expect(acceptorProfile.totalProfit.toNumber()).to.be.closeTo(
        -Math.floor(anchor.web3.LAMPORTS_PER_SOL * 2 / 3),
        1000 // Allow small rounding differences
      );

      // Verify creator profile stats
      const updatedCreatorProfile = await program.account.profile.fetch(creatorProfilePDA);
      expect(updatedCreatorProfile.totalMyBetWins).to.equal(1); // From first bet
      expect(updatedCreatorProfile.totalMyBetLosses).to.equal(1);
      // Creator profit: previous win (3 SOL) - current loss (1 SOL) = 2 SOL
      expect(updatedCreatorProfile.totalProfit.toNumber()).to.equal(2 * anchor.web3.LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Error creating and resolving bet with acceptor win:", error);
      throw error;
    }
  });
});
