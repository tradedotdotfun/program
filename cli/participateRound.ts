import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { readFileSync } from "fs";
import dotenv from "dotenv";
import path from "path";
import {
  programAuthority,
  provider,
  wallet,
  program,
  connection,
  vaultPDA,
  rewardTokenMint,
} from "./helper";

dotenv.config();

// Try to import the IDL dynamically
let IDL;
try {
  IDL = JSON.parse(
    readFileSync(
      path.join(__dirname, "../target/idl/cpi_swap_program.json"),
      "utf-8"
    )
  );
} catch (error) {
  console.warn(
    "Warning: Could not load IDL file. Ensure you've built your program with 'anchor build'."
  );
  IDL = {
    version: "0.1.0",
    name: "cpi_swap_program",
    instructions: [
      {
        name: "participateRound",
        accounts: [
          { name: "user", isMut: true, isSigner: true },
          { name: "round", isMut: true, isSigner: false },
          { name: "rewardMint", isMut: true, isSigner: false },
          { name: "userRewardTokenAccount", isMut: true, isSigner: false },
          { name: "roundRewardTokenAccount", isMut: true, isSigner: false },
          { name: "rewardMintProgram", isMut: false, isSigner: false },
          { name: "systemProgram", isMut: false, isSigner: false },
          { name: "associatedTokenProgram", isMut: false, isSigner: false },
        ],
        args: [{ name: "roundNumber", type: "u64" }],
      },
    ],
  };
}

// Function to check if an account exists
const accountExists = async (address: PublicKey): Promise<boolean> => {
  try {
    const account = await connection.getAccountInfo(address);
    return account !== null;
  } catch (error) {
    return false;
  }
};

// Function to participate in a round
const participateRound = async (roundNumber: number): Promise<string> => {
  try {
    console.log(`Participating in round ${roundNumber}...`);

    // Convert round number to BN
    const roundNumberBN = new BN(roundNumber);

    // Find the round PDA
    const [roundPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("round"), roundNumberBN.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    console.log(`Round PDA: ${roundPDA.toString()}`);

    // Get user reward token account
    const userRewardTokenAccount = await getAssociatedTokenAddress(
      rewardTokenMint,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    // Check if user reward token account exists
    const userRewardAccountExists = await accountExists(userRewardTokenAccount);
    if (!userRewardAccountExists) {
      console.error(
        "You need to have reward tokens in your wallet to participate in a round."
      );
      console.error("Please make a deposit first to receive reward tokens.");
      throw new Error("User reward token account not found");
    }

    // Get round's reward token account
    const roundRewardTokenAccount = await getAssociatedTokenAddress(
      rewardTokenMint,
      roundPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    console.log(
      `User Reward Token Account: ${userRewardTokenAccount.toString()}`
    );
    console.log(
      `Round Reward Token Account: ${roundRewardTokenAccount.toString()}`
    );

    // Create the participate round instruction
    const participateRoundIx = await program.methods
      .participateRound(roundNumberBN)
      .accounts({
        user: wallet.publicKey,
        round: roundPDA,
        rewardMint: rewardTokenMint,
        userRewardTokenAccount: userRewardTokenAccount,
        roundRewardTokenAccount: roundRewardTokenAccount,
        rewardMintProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      } as any)
      .instruction();

    // Create a transaction with the participate round instruction
    const transaction = new Transaction().add(participateRoundIx);

    // Send and confirm the transaction
    console.log("Sending transaction...");
    const signature = await provider.sendAndConfirm(transaction, []);
    console.log(
      `Successfully participated in round ${roundNumber}! Signature: ${signature}`
    );
    return signature;
  } catch (error) {
    console.error("Error participating in round:", error);
    throw error;
  }
};

// Main function to parse command line arguments and execute the appropriate function
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log("Usage:");
    console.log("  npx ts-node cli/participateRound.ts <round_number>");
    process.exit(1);
  }

  const roundNumber = parseInt(args[0]);

  if (isNaN(roundNumber)) {
    console.error("Invalid round number. Please provide a valid number.");
    process.exit(1);
  }

  await participateRound(roundNumber);
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export the function for use in other files
export { participateRound };
