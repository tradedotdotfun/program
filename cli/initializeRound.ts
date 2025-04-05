import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import dotenv from "dotenv";
import path from "path";
import { provider, wallet, program, connection } from "./helper";

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
        name: "initializeRound",
        accounts: [
          { name: "round", isMut: true, isSigner: false },
          { name: "authority", isMut: true, isSigner: true },
          { name: "systemProgram", isMut: false, isSigner: false },
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

// Function to initialize a new round
const initializeRound = async (roundNumber: number): Promise<string> => {
  try {
    console.log(`Initializing round ${roundNumber}...`);

    // Convert round number to BN
    const roundNumberBN = new BN(roundNumber);

    // Find the round PDA
    const [roundPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("round"), roundNumberBN.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    console.log(`Round PDA: ${roundPDA.toString()}`);

    // Check if round account already exists
    const roundExists = await accountExists(roundPDA);
    if (roundExists) {
      console.log(`Round ${roundNumber} already initialized!`);
      throw new Error(`Round ${roundNumber} already exists`);
    }

    // Create the initialize round instruction
    const initializeRoundIx = await program.methods
      .initializeRound(roundNumberBN)
      .accounts({
        round: roundPDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .instruction();

    // Create a transaction with the initialize round instruction
    const transaction = new Transaction().add(initializeRoundIx);

    // Send and confirm the transaction
    console.log("Sending transaction...");
    const signature = await provider.sendAndConfirm(transaction, []);
    console.log(
      `Round ${roundNumber} initialized successfully! Signature: ${signature}`
    );
    return signature;
  } catch (error) {
    console.error("Error initializing round:", error);
    throw error;
  }
};

// Main function to parse command line arguments and execute the appropriate function
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log("Usage:");
    console.log(
      "  npx ts-node cli/initializeRound.ts <round_number> <start_timestamp> <end_timestamp>"
    );
    process.exit(1);
  }

  const roundNumber = parseInt(args[0]);
  const startTimestamp = parseInt(args[1]);
  const endTimestamp = parseInt(args[2]);

  if (isNaN(roundNumber)) {
    console.error("Invalid round number. Please provide a valid number.");
    process.exit(1);
  }

  if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
    console.error("Invalid timestamps. Please provide valid UNIX timestamps.");
    process.exit(1);
  }

  // TODO: Update the initializeRound function to accept start and end timestamps
  // For now, we'll just use the existing function
  await initializeRound(roundNumber);
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export the function for use in other files
export { initializeRound };
