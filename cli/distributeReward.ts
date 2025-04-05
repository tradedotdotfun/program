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
// import { PythSolanaReceiver } from "@pythnetwork/pyth-solana-receiver";

dotenv.config();
const INF_SOL_PRICE_FEED_ID =
  "0x3e9961b890c4e77e9009c1a6d81dc556e24a3c190b02d1682c8f545c53b1d4a2";

// Create the Pyth Solana Receiver
// const pythSolanaReceiver = new PythSolanaReceiver({ connection, wallet });

// Get the Pyth price feed account address for INF_SOL
// Using shard ID 0, you can change this if needed to prevent congestion
// const pythPriceAccount = new PublicKey(
//   pythSolanaReceiver.getPriceFeedAccountAddress(0, INF_SOL_PRICE_FEED_ID)
// );

// console.log(pythPriceAccount.toString(), "pythPriceAccount");

const infMint = new PublicKey("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm");

// Function to check if an account exists
const accountExists = async (address: PublicKey): Promise<boolean> => {
  try {
    const account = await connection.getAccountInfo(address);
    return account !== null;
  } catch (error) {
    return false;
  }
};

// Function to distribute rewards
const distributeReward = async (
  roundNumber: number,
  winners: Array<[string, number]> // Array of [winnerAddress, percentage]
): Promise<string> => {
  try {
    console.log(`Distributing rewards for round ${roundNumber}...`);
    // console.log(
    //   `Using Pyth price feed account: ${pythPriceAccount.toString()}`
    // );

    // Validate winner ratios sum to 100%
    const totalRatio = winners.reduce((sum, [_, ratio]) => sum + ratio, 0);
    if (totalRatio !== 100) {
      throw new Error(`Winner ratios must sum to 100%, got ${totalRatio}%`);
    }

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

    // Find the vault authority PDA
    const [vaultAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from("vault_authority")],
      program.programId
    );

    console.log(`Round PDA: ${roundPDA.toString()}`);
    console.log(`Vault Data PDA: ${vaultDataPDA.toString()}`);
    console.log(`Vault Authority: ${vaultAuthority.toString()}`);

    // Check if round exists
    const roundExists = await accountExists(roundPDA);
    if (!roundExists) {
      throw new Error(`Round ${roundNumber} does not exist`);
    }

    // Get the vault token account (INF token account)
    const vaultTokenAccount = await getAssociatedTokenAddress(
      infMint,
      vaultAuthority,
      true,
      TOKEN_PROGRAM_ID
    );

    // Get the round reward token account
    const roundRewardTokenAccount = await getAssociatedTokenAddress(
      rewardTokenMint,
      roundPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    // Log some information about the accounts
    console.log(`Vault INF Token Account: ${vaultTokenAccount.toString()}`);
    console.log(
      `Round Reward Token Account: ${roundRewardTokenAccount.toString()}`
    );

    // Check vault INF token account balance
    try {
      const vaultBalance = await connection.getTokenAccountBalance(
        vaultTokenAccount
      );
      console.log(`Vault INF Balance: ${vaultBalance.value.uiAmount}`);
    } catch (err) {
      console.warn("Could not get vault token balance");
    }

    // Format winners for the instruction
    console.log(winners, "winners");
    const winnerAddresses = winners.map(
      ([address, _]) => new PublicKey(address)
    );
    const winnerRatios = winners.map(([_, ratio]) => new BN(ratio));

    // Get the token accounts for all winners
    console.log("Finding token accounts for winners...");
    const winnerTokenAccounts = await Promise.all(
      winnerAddresses.map(async (address) => {
        const tokenAddress = await getAssociatedTokenAddress(
          infMint,
          address,
          false,
          TOKEN_PROGRAM_ID
        );
        console.log(
          `Winner ${address.toString()} token account: ${tokenAddress.toString()}`
        );

        // Check if account exists
        const exists = await accountExists(tokenAddress);
        if (!exists) {
          console.warn(
            `Warning: Token account ${tokenAddress.toString()} does not exist. Creating it...`
          );
          // You could create the token account here if needed
        }

        return {
          pubkey: tokenAddress,
          isWritable: true,
          isSigner: false,
        };
      })
    );

    const infPriceAccount = new PublicKey(
      "Ceg5oePJv1a6RR541qKeQaTepvERA3i8SvyueX9tT8Sq"
    );

    const solPriceAccount = new PublicKey(
      "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"
    );

    console.log(winnerAddresses, "winnerAddresses");
    console.log(winnerRatios, "winnerRatios");

    // Create the distribute reward instruction
    const distributeRewardIx = await program.methods
      .distributeReward(roundNumberBN, winnerAddresses, winnerRatios)
      .accounts({
        authority: wallet.publicKey,
        round: roundPDA,
        vaultData: vaultDataPDA,
        vaultTokenAccount: vaultTokenAccount,
        rewardMint: rewardTokenMint,
        roundRewardTokenAccount: roundRewardTokenAccount,
        vaultAuthority: vaultAuthority,
        infMint: infMint,
        infMintProgram: TOKEN_PROGRAM_ID,
        rewardMintProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        priceUpdateInf: infPriceAccount,
        priceUpdateSol: solPriceAccount,
      } as any)
      .remainingAccounts(winnerTokenAccounts)
      .instruction();

    // Create a transaction with the distribute reward instruction
    const transaction = new Transaction().add(distributeRewardIx);

    // Send and confirm the transaction
    console.log("Sending transaction...");
    const signature = await provider.sendAndConfirm(transaction, []);
    console.log(
      `Rewards successfully distributed for round ${roundNumber}! Signature: ${signature}`
    );

    // Print winner info
    console.log("\nReward Distribution:");
    winners.forEach(([address, percentage]) => {
      console.log(`Address: ${address} - ${percentage}%`);
    });

    return signature;
  } catch (error) {
    console.error("Error distributing rewards:", error);
    throw error;
  }
};

// Main function to parse command line arguments and execute
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3 || args[0] !== "distribute") {
    console.log("Usage:");
    console.log(
      "  ts-node distributeReward.ts distribute <round_number> <winner1_address>:<ratio> <winner2_address>:<ratio> ..."
    );
    console.log("Example:");
    console.log(
      "  ts-node distributeReward.ts distribute 2 ALiCeAddress123:60 BoBAddress456:40"
    );
    process.exit(1);
  }

  const roundNumber = parseInt(args[1]);
  if (isNaN(roundNumber)) {
    console.error("Invalid round number. Please provide a valid number.");
    process.exit(1);
  }

  // Parse winner addresses and ratios
  const winners: Array<[string, number]> = [];
  for (let i = 2; i < args.length; i++) {
    const entry = args[i];
    const [address, ratioStr] = entry.split(":");

    if (!address || !ratioStr) {
      console.error(
        `Invalid winner entry: ${entry}. Format should be "address:ratio"`
      );
      process.exit(1);
    }

    try {
      // Validate address format
      new PublicKey(address);
    } catch (err) {
      console.error(`Invalid address format: ${address}`);
      process.exit(1);
    }

    const ratio = parseInt(ratioStr);
    if (isNaN(ratio) || ratio <= 0 || ratio > 100) {
      console.error(
        `Invalid ratio: ${ratioStr}. Must be a number between 1 and 100`
      );
      process.exit(1);
    }

    winners.push([address, ratio]);
  }

  // Check that ratios sum to 100
  const totalRatio = winners.reduce((sum, [_, ratio]) => sum + ratio, 0);
  if (totalRatio !== 100) {
    console.error(`Winner ratios must sum to 100%, got ${totalRatio}%`);
    process.exit(1);
  }

  await distributeReward(roundNumber, winners);
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export the function for use in other files
export { distributeReward };
