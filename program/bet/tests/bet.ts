import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Bet } from "../target/types/bet";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { expect } from "chai";
import { Buffer } from "buffer";

// Program ID from lib.rs
const PROGRAM_ID = new PublicKey("8a6kHAGhMgMEJnhDEafuZf1JYc4a9rdWySJNQ311UhHD");

// Deploying flag - set to true to skip tests and only deploy
const DEPLOYING = true;

describe("bet", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.bet as Program<Bet>;
  const provider = anchor.getProvider();

  // Target wallet for airdrop
  const targetWallet = new PublicKey("G6dq1syv1MQUeuhopeeFAX473GcvVAQrQFZQnyQXqoEv");
  const airdropWallet = new PublicKey("5kTkpwcFDi3Ae1q8aTEVsoJY2mYtoJxZPVGTWmjcNjmV");
  const airdropWallet2 = new PublicKey("67onDYzJwHaGjCLYwt8e8Faph2cfQi8Fb9RTmeH4d93Z");

  // Test accounts
  const creator = Keypair.generate();
  const acceptor = Keypair.generate();
  const thirdPartyReferee = Keypair.generate();
  const privateBetRecipient = Keypair.generate();
  const unauthorizedUser = Keypair.generate();

  // PDAs
  let creatorProfilePDA: PublicKey;
  let acceptorProfilePDA: PublicKey;
  let privateBetRecipientProfilePDA: PublicKey;
  let unauthorizedUserProfilePDA: PublicKey;
  let betPDA: PublicKey;

  // If deploying, skip all tests and just verify deployment
  if (DEPLOYING) {
    it("Deploy program", async () => {
      // Just verify the program is accessible - Anchor already deployed it
      const programId = program.programId;
      console.log("Program deployed at:", programId.toBase58());
      expect(programId).to.not.be.null;
    });
    return; // Exit early, skip all other tests
  }

  before(async () => {
    try {
      // Airdrop SOL to test accounts and target wallet
      // Creator needs enough for multiple bets (1 SOL + 0.5 SOL + 1 SOL = 2.5 SOL) + fees
      // Acceptor needs enough for calculated bet amount (1 SOL * 3/1 = 3 SOL) + fees
      const creatorAirdropAmount = 4 * anchor.web3.LAMPORTS_PER_SOL; // Enough for multiple bets + fees
      const acceptorAirdropAmount = 5 * anchor.web3.LAMPORTS_PER_SOL; // Enough for 3 SOL bet + fees
      const airdropPromises = [
        provider.connection.requestAirdrop(creator.publicKey, creatorAirdropAmount),
        provider.connection.requestAirdrop(acceptor.publicKey, acceptorAirdropAmount),
        provider.connection.requestAirdrop(thirdPartyReferee.publicKey, creatorAirdropAmount),
        provider.connection.requestAirdrop(privateBetRecipient.publicKey, acceptorAirdropAmount),
        provider.connection.requestAirdrop(unauthorizedUser.publicKey, acceptorAirdropAmount),
        provider.connection.requestAirdrop(targetWallet, creatorAirdropAmount),
        provider.connection.requestAirdrop(airdropWallet, creatorAirdropAmount),
        provider.connection.requestAirdrop(airdropWallet2, creatorAirdropAmount),
      ];
      await Promise.all(airdropPromises);

      // Wait for airdrops to confirm
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Find PDAs - Note: We'll derive these after creating profiles with usernames
      // For now, we'll create them in the test functions where we know the usernames
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

      // Derive profile PDA using username
      [creatorProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("username-"), name],
        PROGRAM_ID
      );

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
      expect(profile.totalMyBetProfit.toNumber()).to.equal(0); // i64 is BN
      expect(profile.totalAcceptedBetProfit.toNumber()).to.equal(0); // i64 is BN
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

      // Derive profile PDA using username
      [acceptorProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("username-"), name],
        PROGRAM_ID
      );

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
      // Get current bet count from profile account (used in PDA seeds)
      const creatorProfile = await program.account.profile.fetch(creatorProfilePDA);
      const betCount = creatorProfile.totalMyBetCount;

      // Calculate bet PDA using profile.total_my_bet_count (as u32, 4 bytes, little-endian)
      const betCountBuffer = Buffer.alloc(4);
      betCountBuffer.writeUInt32LE(betCount, 0);
      [betPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), creator.publicKey.toBuffer(), betCountBuffer],
        PROGRAM_ID
      );

      // Calculate treasury PDA
      const [treasuryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet-treasury-"), betPDA.toBuffer()],
        PROGRAM_ID
      );

      // Get creator balance before
      const creatorBalanceBefore = await provider.connection.getBalance(creator.publicKey);

      // Set bet parameters
      const betAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL); // 1 SOL
      const description = Buffer.alloc(128);
      const descriptionText = "Test bet description";
      Buffer.from(descriptionText).copy(description);
      const refereeType = 0; // Honor System
      const category = 9; // Other
      const oddsWin = new anchor.BN(3);
      const oddsLose = new anchor.BN(1);
      const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 1 day from now

      const tx = await program.methods
        .createBet(
          betAmount,
          Array.from(description),
          refereeType,
          category,
          oddsWin,
          oddsLose,
          expiresAt,
          0, // bet_available_to: 0 = Public
          null // private_bet_recipient: null for public bets
        )
        .accounts({
          creator: creator.publicKey,
          profile: creatorProfilePDA,
          referee: creator.publicKey, // For Honor System, referee is creator
          bet: betPDA,
          treasury: treasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      console.log("Create Bet tx:", tx);

      // Wait for transaction to be confirmed
      await provider.connection.confirmTransaction(tx);

      // Verify bet account
      const bet = await program.account.bet.fetch(betPDA);
      expect(bet.referee.toBase58()).to.equal(creator.publicKey.toBase58()); // Referee is creator for Honor System
      expect(bet.creator.toBase58()).to.equal(creator.publicKey.toBase58());
      expect(bet.acceptor).to.be.null;
      expect(bet.betAmount.toNumber()).to.equal(betAmount.toNumber());
      expect(Buffer.from(bet.description).toString().replace(/\0/g, '')).to.equal(descriptionText);
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
      // Calculate treasury PDA
      const [treasuryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet-treasury-"), betPDA.toBuffer()],
        PROGRAM_ID
      );

      // Fetch bet to get amounts
      const betAccount = await program.account.bet.fetch(betPDA);
      const betAmount = betAccount.betAmount.toNumber();
      const oddsWin = betAccount.oddsWin.toNumber();
      const oddsLose = betAccount.oddsLose.toNumber();
      
      // Calculate acceptor bet amount: creator bet * (oddsWin / oddsLose)
      const acceptorBetAmount = Math.floor(betAmount * oddsWin / oddsLose);

      // Get balances before
      const acceptorBalanceBefore = await provider.connection.getBalance(acceptor.publicKey);
      const treasuryBalanceBefore = await provider.connection.getBalance(treasuryPDA);

      const tx = await program.methods
        .acceptBet()
        .accounts({
          acceptor: acceptor.publicKey,
          creator: creator.publicKey,
          acceptorProfile: acceptorProfilePDA,
          bet: betPDA,
          treasury: treasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([acceptor])
        .rpc();

      console.log("Accept Bet tx:", tx);

      // Wait for transaction to be confirmed
      await provider.connection.confirmTransaction(tx);

      // Verify SOL was transferred to treasury
      const acceptorBalanceAfter = await provider.connection.getBalance(acceptor.publicKey);
      const treasuryBalanceAfter = await provider.connection.getBalance(treasuryPDA);
      expect(acceptorBalanceAfter).to.be.lessThan(acceptorBalanceBefore);
      expect(treasuryBalanceAfter).to.equal(treasuryBalanceBefore + acceptorBetAmount);

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

      // Calculate treasury PDA
      const [treasuryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet-treasury-"), betPDA.toBuffer()],
        PROGRAM_ID
      );

      const tx = await program.methods
        .resolveBet(winnerIsCreator)
        .accounts({
          resolver: creator.publicKey,
          referee: creator.publicKey, // For Honor System, referee is creator
          creator: creator.publicKey,
          acceptor: acceptor.publicKey,
          creatorProfile: creatorProfilePDA,
          acceptorProfile: acceptorProfilePDA,
          bet: betPDA,
          treasury: treasuryPDA,
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
      expect(creatorProfile.totalMyBetProfit.toNumber()).to.equal(expectedProfit.toNumber());

      // Verify acceptor profile stats
      const acceptorProfile = await program.account.profile.fetch(acceptorProfilePDA);
      expect(acceptorProfile.totalAcceptedBetWins).to.equal(0);
      expect(acceptorProfile.totalAcceptedBetLosses).to.equal(1);
      // Acceptor loses their bet amount (1 SOL)
      expect(acceptorProfile.totalAcceptedBetProfit.toNumber()).to.equal(-1 * anchor.web3.LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Error resolving bet:", error);
      throw error;
    }
  });

  it("Create Second Bet and Cancel It", async () => {
    try {
      // Get current bet count from profile account (used in PDA seeds)
      const creatorProfile = await program.account.profile.fetch(creatorProfilePDA);
      const betCount = creatorProfile.totalMyBetCount;

      // Calculate bet PDA using profile.total_my_bet_count (as u32, 4 bytes, little-endian)
      const betCountBuffer = Buffer.alloc(4);
      betCountBuffer.writeUInt32LE(betCount, 0);
      const [cancelBetPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), creator.publicKey.toBuffer(), betCountBuffer],
        PROGRAM_ID
      );

      // Calculate treasury PDA
      const [cancelTreasuryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet-treasury-"), cancelBetPDA.toBuffer()],
        PROGRAM_ID
      );

      // Set bet parameters
      const betAmount = new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL);
      const description = Buffer.alloc(128);
      const descriptionText = "Second bet to cancel";
      Buffer.from(descriptionText).copy(description);
      const refereeType = 0; // Honor System
      const category = 9; // Other
      const oddsWin = new anchor.BN(2);
      const oddsLose = new anchor.BN(1);
      const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

      // Create the bet
      const createTx = await program.methods
        .createBet(
          betAmount,
          Array.from(description),
          refereeType,
          category,
          oddsWin,
          oddsLose,
          expiresAt,
          0, // bet_available_to: 0 = Public
          null // private_bet_recipient: null for public bets
        )
        .accounts({
          creator: creator.publicKey,
          profile: creatorProfilePDA,
          referee: creator.publicKey, // For Honor System, referee is creator
          bet: cancelBetPDA,
          treasury: cancelTreasuryPDA,
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

      // Verify bet count remains the same (we don't decrement on cancel)
      updatedProfile = await program.account.profile.fetch(creatorProfilePDA);
      expect(updatedProfile.totalMyBetCount).to.equal(2);
    } catch (error) {
      console.error("Error creating and cancelling bet:", error);
      throw error;
    }
  });

  it("Create and Resolve Bet - Acceptor Wins", async () => {
    try {
      // Airdrop more SOL to creator if needed (they've already created 2 bets)
      const creatorBalance = await provider.connection.getBalance(creator.publicKey);
      const minRequired = 1.5 * anchor.web3.LAMPORTS_PER_SOL; // 1 SOL for bet + fees
      if (creatorBalance < minRequired) {
        await provider.connection.requestAirdrop(creator.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Get current bet count from profile account (used in PDA seeds)
      const creatorProfile = await program.account.profile.fetch(creatorProfilePDA);
      const betCount = creatorProfile.totalMyBetCount;

      // Calculate bet PDA using profile.total_my_bet_count (as u32, 4 bytes, little-endian)
      const betCountBuffer = Buffer.alloc(4);
      betCountBuffer.writeUInt32LE(betCount, 0);
      const [newBetPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), creator.publicKey.toBuffer(), betCountBuffer],
        PROGRAM_ID
      );

      // Calculate treasury PDA
      const [newTreasuryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet-treasury-"), newBetPDA.toBuffer()],
        PROGRAM_ID
      );

      // Set bet parameters
      const betAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
      const description = Buffer.alloc(128);
      const descriptionText = "Third bet for acceptor win";
      Buffer.from(descriptionText).copy(description);
      const refereeType = 0; // Honor System
      const category = 9; // Other
      const oddsWin = new anchor.BN(1);
      const oddsLose = new anchor.BN(3); // 1:3 odds
      const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

      // Create the bet
      const createTx = await program.methods
        .createBet(
          betAmount,
          Array.from(description),
          refereeType,
          category,
          oddsWin,
          oddsLose,
          expiresAt,
          0, // bet_available_to: 0 = Public
          null // private_bet_recipient: null for public bets
        )
        .accounts({
          creator: creator.publicKey,
          profile: creatorProfilePDA,
          referee: creator.publicKey, // For Honor System, referee is creator
          bet: newBetPDA,
          treasury: newTreasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      await provider.connection.confirmTransaction(createTx);

      // Get bet account to calculate acceptor amount
      const newBetAccount = await program.account.bet.fetch(newBetPDA);
      const newBetAmount = newBetAccount.betAmount.toNumber();
      const newOddsWin = newBetAccount.oddsWin.toNumber();
      const newOddsLose = newBetAccount.oddsLose.toNumber();
      const newAcceptorBetAmount = Math.floor(newBetAmount * newOddsWin / newOddsLose);

      // Get balances before accept
      const acceptorBalanceBeforeAccept = await provider.connection.getBalance(acceptor.publicKey);
      const newTreasuryBalanceBefore = await provider.connection.getBalance(newTreasuryPDA);

      // Accept the bet
      const acceptTx = await program.methods
        .acceptBet()
        .accounts({
          acceptor: acceptor.publicKey,
          creator: creator.publicKey,
          acceptorProfile: acceptorProfilePDA,
          bet: newBetPDA,
          treasury: newTreasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([acceptor])
        .rpc();

      await provider.connection.confirmTransaction(acceptTx);

      // Verify SOL was transferred
      const acceptorBalanceAfterAccept = await provider.connection.getBalance(acceptor.publicKey);
      const newTreasuryBalanceAfter = await provider.connection.getBalance(newTreasuryPDA);
      expect(acceptorBalanceAfterAccept).to.be.lessThan(acceptorBalanceBeforeAccept);
      expect(newTreasuryBalanceAfter).to.equal(newTreasuryBalanceBefore + newAcceptorBetAmount);

      await provider.connection.confirmTransaction(acceptTx);

      // Resolve with acceptor winning
      const resolveTx = await program.methods
        .resolveBet(false) // winner_is_creator = false
        .accounts({
          resolver: creator.publicKey,
          referee: creator.publicKey, // For Honor System, referee is creator
          creator: creator.publicKey,
          acceptor: acceptor.publicKey,
          creatorProfile: creatorProfilePDA,
          acceptorProfile: acceptorProfilePDA,
          bet: newBetPDA,
          treasury: newTreasuryPDA,
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
      expect(acceptorProfile.totalAcceptedBetProfit.toNumber()).to.be.closeTo(
        -Math.floor(anchor.web3.LAMPORTS_PER_SOL * 2 / 3),
        1000 // Allow small rounding differences
      );

      // Verify creator profile stats
      const updatedCreatorProfile = await program.account.profile.fetch(creatorProfilePDA);
      expect(updatedCreatorProfile.totalMyBetWins).to.equal(1); // From first bet
      expect(updatedCreatorProfile.totalMyBetLosses).to.equal(1);
      // Creator profit: previous win (3 SOL) - current loss (1 SOL) = 2 SOL
      expect(updatedCreatorProfile.totalMyBetProfit.toNumber()).to.equal(2 * anchor.web3.LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Error creating and resolving bet with acceptor win:", error);
      throw error;
    }
  });

  it("Create Third Party Bet", async () => {
    try {
      // Get current bet count from profile account (used in PDA seeds)
      const creatorProfile = await program.account.profile.fetch(creatorProfilePDA);
      const betCount = creatorProfile.totalMyBetCount;

      // Calculate bet PDA using profile.total_my_bet_count (as u32, 4 bytes, little-endian)
      const betCountBuffer = Buffer.alloc(4);
      betCountBuffer.writeUInt32LE(betCount, 0);
      const [thirdPartyBetPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), creator.publicKey.toBuffer(), betCountBuffer],
        PROGRAM_ID
      );

      // Calculate treasury PDA
      const [thirdPartyTreasuryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet-treasury-"), thirdPartyBetPDA.toBuffer()],
        PROGRAM_ID
      );

      // Set bet parameters for Third Party
      const betAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
      const description = Buffer.alloc(128);
      const descriptionText = "Third Party bet with designated referee";
      Buffer.from(descriptionText).copy(description);
      const refereeType = 2; // Third Party
      const category = 9; // Other
      const oddsWin = new anchor.BN(2);
      const oddsLose = new anchor.BN(1);
      const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

      const tx = await program.methods
        .createBet(
          betAmount,
          Array.from(description),
          refereeType,
          category,
          oddsWin,
          oddsLose,
          expiresAt,
          0, // bet_available_to: 0 = Public
          null // private_bet_recipient: null for public bets
        )
        .accounts({
          creator: creator.publicKey,
          profile: creatorProfilePDA,
          referee: thirdPartyReferee.publicKey, // Third Party uses designated referee
          bet: thirdPartyBetPDA,
          treasury: thirdPartyTreasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      console.log("Create Third Party Bet tx:", tx);

      // Wait for transaction to be confirmed
      await provider.connection.confirmTransaction(tx);

      // Verify bet account
      const bet = await program.account.bet.fetch(thirdPartyBetPDA);
      expect(bet.referee.toBase58()).to.equal(thirdPartyReferee.publicKey.toBase58()); // Referee is third party
      expect(bet.creator.toBase58()).to.equal(creator.publicKey.toBase58());
      expect(bet.refereeType).to.equal(refereeType);
      expect(bet.status).to.equal(0); // Open

      // Verify creator profile bet count was incremented
      const updatedProfile = await program.account.profile.fetch(creatorProfilePDA);
      expect(updatedProfile.totalMyBetCount).to.equal(betCount + 1);
    } catch (error) {
      console.error("Error creating third party bet:", error);
      throw error;
    }
  });

  it("Create Private Bet Recipient Profile", async () => {
    try {
      // Create name buffer (32 bytes)
      const name = Buffer.alloc(32);
      const profileName = "PrivateRecipient";
      Buffer.from(profileName).copy(name);

      // Derive profile PDA using username
      [privateBetRecipientProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("username-"), name],
        PROGRAM_ID
      );

      const tx = await program.methods
        .createProfile(Array.from(name))
        .accounts({
          wallet: privateBetRecipient.publicKey,
          profile: privateBetRecipientProfilePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([privateBetRecipient])
        .rpc();

      console.log("Create Private Bet Recipient Profile tx:", tx);
      await provider.connection.confirmTransaction(tx);

      // Verify profile account
      const profile = await program.account.profile.fetch(privateBetRecipientProfilePDA);
      expect(profile.wallet.toBase58()).to.equal(privateBetRecipient.publicKey.toBase58());
      expect(Buffer.from(profile.name).toString().replace(/\0/g, '')).to.equal("PrivateRecipient");
    } catch (error) {
      console.error("Error creating private bet recipient profile:", error);
      throw error;
    }
  });

  it("Create Unauthorized User Profile", async () => {
    try {
      // Create name buffer (32 bytes)
      const name = Buffer.alloc(32);
      const profileName = "Unauthorized";
      Buffer.from(profileName).copy(name);

      // Derive profile PDA using username
      [unauthorizedUserProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("username-"), name],
        PROGRAM_ID
      );

      const tx = await program.methods
        .createProfile(Array.from(name))
        .accounts({
          wallet: unauthorizedUser.publicKey,
          profile: unauthorizedUserProfilePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([unauthorizedUser])
        .rpc();

      console.log("Create Unauthorized User Profile tx:", tx);
      await provider.connection.confirmTransaction(tx);

      // Verify profile account
      const profile = await program.account.profile.fetch(unauthorizedUserProfilePDA);
      expect(profile.wallet.toBase58()).to.equal(unauthorizedUser.publicKey.toBase58());
      expect(Buffer.from(profile.name).toString().replace(/\0/g, '')).to.equal("Unauthorized");
    } catch (error) {
      console.error("Error creating unauthorized user profile:", error);
      throw error;
    }
  });

  it("Create Private Bet and Verify Only Recipient Can Accept", async () => {
    try {
      // Get current bet count from profile account (used in PDA seeds)
      const creatorProfile = await program.account.profile.fetch(creatorProfilePDA);
      const betCount = creatorProfile.totalMyBetCount;

      // Calculate bet PDA using profile.total_my_bet_count (as u32, 4 bytes, little-endian)
      const betCountBuffer = Buffer.alloc(4);
      betCountBuffer.writeUInt32LE(betCount, 0);
      const [privateBetPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), creator.publicKey.toBuffer(), betCountBuffer],
        PROGRAM_ID
      );

      // Calculate treasury PDA
      const [treasuryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet-treasury-"), privateBetPDA.toBuffer()],
        PROGRAM_ID
      );

      // Set bet parameters for Private bet
      const betAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
      const description = Buffer.alloc(128);
      const descriptionText = "Private bet for specific recipient";
      Buffer.from(descriptionText).copy(description);
      const refereeType = 0; // Honor System
      const category = 9; // Other
      const oddsWin = new anchor.BN(2);
      const oddsLose = new anchor.BN(1);
      const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);
      const betAvailableTo = 2; // Private
      const privateBetRecipientPubkey = privateBetRecipient.publicKey;

      // Create the private bet
      const createTx = await program.methods
        .createBet(
          betAmount,
          Array.from(description),
          refereeType,
          category,
          oddsWin,
          oddsLose,
          expiresAt,
          betAvailableTo,
          privateBetRecipientPubkey
        )
        .accounts({
          creator: creator.publicKey,
          profile: creatorProfilePDA,
          referee: creator.publicKey, // Honor System uses creator as referee
          bet: privateBetPDA,
          treasury: treasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      console.log("Create Private Bet tx:", createTx);
      await provider.connection.confirmTransaction(createTx);

      // Verify bet account
      const bet = await program.account.bet.fetch(privateBetPDA);
      expect(bet.betAvailableTo).to.equal(2); // Private
      expect(bet.privateBetRecipient).to.not.be.null;
      if (bet.privateBetRecipient) {
        expect(bet.privateBetRecipient.toBase58()).to.equal(privateBetRecipient.publicKey.toBase58());
      }
      expect(bet.status).to.equal(0); // Open

      // Try to accept with unauthorized user - should fail
      let unauthorizedAcceptFailed = false;
      try {
        const unauthorizedAcceptTx = await program.methods
          .acceptBet()
          .accounts({
            acceptor: unauthorizedUser.publicKey,
            creator: creator.publicKey,
            acceptorProfile: unauthorizedUserProfilePDA,
            bet: privateBetPDA,
            treasury: treasuryPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedUser])
          .rpc();

        // If we get here, the transaction succeeded when it shouldn't have
        throw new Error("Unauthorized user was able to accept private bet - this should not happen!");
      } catch (error: any) {
        // Expected to fail with Unauthorized error (code 6003)
        // Check for error code or error message
        if (error.code === 6003 || error.error?.errorCode?.code === "Unauthorized" || 
            (error.error?.errorMessage && error.error.errorMessage.includes("Unauthorized"))) {
          unauthorizedAcceptFailed = true;
          console.log("Correctly rejected unauthorized user attempt to accept private bet");
        } else {
          // Log the error to help debug
          console.error("Unexpected error when unauthorized user tried to accept:", error);
          throw error;
        }
      }
      expect(unauthorizedAcceptFailed).to.be.true;

      // Accept with the correct recipient - should succeed
      const acceptTx = await program.methods
        .acceptBet()
        .accounts({
          acceptor: privateBetRecipient.publicKey,
          creator: creator.publicKey,
          acceptorProfile: privateBetRecipientProfilePDA,
          bet: privateBetPDA,
          treasury: treasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([privateBetRecipient])
        .rpc();

      console.log("Accept Private Bet (correct recipient) tx:", acceptTx);
      await provider.connection.confirmTransaction(acceptTx);

      // Verify bet was accepted
      const acceptedBet = await program.account.bet.fetch(privateBetPDA);
      expect(acceptedBet.acceptor).to.not.be.null;
      if (acceptedBet.acceptor) {
        expect(acceptedBet.acceptor.toBase58()).to.equal(privateBetRecipient.publicKey.toBase58());
      }
      expect(acceptedBet.status).to.equal(1); // Accepted
      expect(acceptedBet.acceptedAt).to.not.be.null;

      // Verify recipient profile accepted count was incremented
      const recipientProfile = await program.account.profile.fetch(privateBetRecipientProfilePDA);
      expect(recipientProfile.totalBetsAcceptedCount).to.equal(1);
    } catch (error) {
      console.error("Error testing private bet acceptance:", error);
      throw error;
    }
  });
});
