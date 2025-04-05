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
} from "@solana/spl-token";
import { readFileSync } from "fs";
import dotenv from "dotenv";
import path from "path";
import { provider, wallet, program, connection } from "./helper";

dotenv.config();

// Try to import the IDL dynamically - in a real application, you would ensure this exists
let IDL;
try {
  // This assumes the IDL is already built and available
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
  // Fallback empty IDL structure
  IDL = {
    version: "0.1.0",
    name: "cpi_swap_program",
    instructions: [
      {
        name: "redeem",
        accounts: [
          { name: "user", isMut: true, isSigner: true },
          { name: "userData", isMut: true, isSigner: false },
          { name: "vaultData", isMut: true, isSigner: false },
          { name: "tokenMint", isMut: false, isSigner: false },
          { name: "tokenProgram", isMut: false, isSigner: false },
          { name: "userTokenAccount", isMut: true, isSigner: false },
          { name: "vaultTokenAccount", isMut: true, isSigner: false },
          { name: "vaultAuthority", isMut: false, isSigner: false },
          { name: "priceUpdateInf", isMut: false, isSigner: false },
          { name: "priceUpdateSol", isMut: false, isSigner: false },
        ],
        args: [],
      },
    ],
  };
}

// Define the program type
type CpiSwapProgram = any; // Replace with proper type when available

// Define Pyth oracle feeds
const INF_USD_PRICE_FEED_ID =
  "F51570985c642c49c2D6E50156390fdBA80bB6D5F7Fa389D2f012CeD4f7d208f";
const SOL_USD_PRICE_FEED_ID =
  "Ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

// Function to get or create an associated token account
const getOrCreateAssociatedTokenAccount = async (
  mint: PublicKey,
  owner: PublicKey
) => {
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mint,
    owner,
    true // Allow owner off curve (for PDAs)
  );

  try {
    // Check if the account already exists
    await connection.getTokenAccountBalance(associatedTokenAddress);
    console.log(
      `Token account ${associatedTokenAddress.toString()} already exists`
    );
    return associatedTokenAddress;
  } catch (error) {
    console.log(
      `Creating token account ${associatedTokenAddress.toString()} for ${mint.toString()}`
    );

    // Create the token account
    const instruction = createAssociatedTokenAccountInstruction(
      wallet.publicKey, // payer
      associatedTokenAddress, // associated token account address
      owner, // owner
      mint // mint
    );

    const transaction = new Transaction().add(instruction);
    const signature = await provider.sendAndConfirm(transaction, []);
    console.log(`Created token account. Signature: ${signature}`);

    return associatedTokenAddress;
  }
};

// Function to redeem tokens from the vault
const redeemTokens = async (tokenMint: PublicKey): Promise<string> => {
  try {
    console.log(`Redeeming INF tokens from the vault...`);

    // Find the vault authority PDA
    const [vaultAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from("vault_authority")],
      program.programId
    );

    // Find the user data PDA
    const [userDataPda] = await PublicKey.findProgramAddress(
      [Buffer.from("user_data"), wallet.publicKey.toBuffer()],
      program.programId
    );

    // Find the vault data PDA
    const [vaultDataPda] = await PublicKey.findProgramAddress(
      [Buffer.from("vault_data")],
      program.programId
    );

    // Get the user's token account for receiving tokens
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      tokenMint,
      wallet.publicKey
    );

    // Get the vault's token account
    const vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
      tokenMint,
      vaultAuthority
    );

    const infPriceAccount = new PublicKey(
      "Ceg5oePJv1a6RR541qKeQaTepvERA3i8SvyueX9tT8Sq"
    );

    const solPriceAccount = new PublicKey(
      "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"
    );

    console.log(`User token account: ${userTokenAccount.toString()}`);
    console.log(`Vault token account: ${vaultTokenAccount.toString()}`);
    console.log(`Vault authority PDA: ${vaultAuthority.toString()}`);
    console.log(`User data PDA: ${userDataPda.toString()}`);
    console.log(`Vault data PDA: ${vaultDataPda.toString()}`);

    // Create the redemption instruction
    const redeemIx = await program.methods
      .redeem()
      .accounts({
        user: wallet.publicKey,
        userData: userDataPda,
        vaultData: vaultDataPda,
        tokenMint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        vaultAuthority: vaultAuthority,
        priceUpdateInf: infPriceAccount,
        priceUpdateSol: solPriceAccount,
      } as any)
      .instruction();

    // Create a transaction with the redeem instruction
    const transaction = new Transaction().add(redeemIx);

    // Send and confirm the transaction
    const signature = await provider.sendAndConfirm(transaction, []);
    console.log(`Redemption successful! Signature: ${signature}`);
    return signature;
  } catch (error) {
    console.error("Error redeeming tokens:", error);
    throw error;
  }
};

// Main function to parse command line arguments and execute the appropriate function
async function main() {
  // Define the available token mints
  const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const SOL = new PublicKey("So11111111111111111111111111111111111111112");
  const INF = new PublicKey("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm");

  const command = process.argv[2];

  if (!command) {
    console.log("Usage:");
    console.log("  ts-node redeem.ts redeem [token_mint]");
    process.exit(1);
  }

  if (command === "redeem") {
    // Default to INF token if not specified
    let tokenMint = INF;
    if (process.argv[3]) {
      tokenMint = new PublicKey(process.argv[3]);
    }

    await redeemTokens(tokenMint);
  } else {
    console.error(`Unknown command: ${command}`);
    console.log("Usage:");
    console.log("  ts-node redeem.ts redeem [token_mint]");
    process.exit(1);
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export the functions for use in other files
export { redeemTokens };
