import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
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
        name: "closeRound",
        accounts: [
          { name: "round", isMut: true, isSigner: false },
          { name: "vaultData", isMut: true, isSigner: false },
          { name: "authority", isMut: true, isSigner: true },
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

// Function to close a round
const closeRound = async (roundNumber: number): Promise<string> => {
  try {
    console.log(`Closing round ${roundNumber}...`);

    // Convert round number to BN
    const roundNumberBN = new BN(roundNumber);

    // Find the round PDA
    const [roundPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("round"), roundNumberBN.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Find the vault data PDA
    const [vaultDataPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("vault_data")],
      program.programId
    );

    console.log(`Round PDA: ${roundPDA.toString()}`);
    console.log(`Vault Data PDA: ${vaultDataPDA.toString()}`);

    // Check if round exists
    const roundExists = await accountExists(roundPDA);
    if (!roundExists) {
      throw new Error(`Round ${roundNumber} does not exist`);
    }

    // Create the close round instruction
    const closeRoundIx = await program.methods
      .closeRound(roundNumberBN)
      .accounts({
        round: roundPDA,
        vaultData: vaultDataPDA,
        authority: wallet.publicKey,
      } as any)
      .instruction();

    // Create a transaction with the close round instruction
    const transaction = new Transaction().add(closeRoundIx);

    // Send and confirm the transaction
    console.log("Sending transaction...");
    const signature = await provider.sendAndConfirm(transaction, []);
    console.log(
      `Round ${roundNumber} closed successfully! Signature: ${signature}`
    );
    return signature;
  } catch (error) {
    console.error("Error closing round:", error);
    throw error;
  }
};

// Main function to parse command line arguments and execute
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log("Usage:");
    console.log("  npx ts-node cli/closeRound.ts <round_number>");
    process.exit(1);
  }

  const roundNumber = parseInt(args[0]);
  if (isNaN(roundNumber)) {
    console.error("Invalid round number. Please provide a valid number.");
    process.exit(1);
  }

  await closeRound(roundNumber);
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export the function for use in other files
export { closeRound };
