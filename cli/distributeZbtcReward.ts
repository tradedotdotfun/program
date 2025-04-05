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
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { readFileSync } from "fs";
import dotenv from "dotenv";
import path from "path";
import fetch from "node-fetch";

import {
  programAuthority,
  provider,
  wallet,
  program,
  connection,
  vaultPDA,
  jupiterProgramId,
  getAssociatedTokenAddressWithInstruction,
} from "./helper";

dotenv.config();

// Constants
const API_ENDPOINT = "https://quote-api.jup.ag/v6";
const INF_MINT = new PublicKey("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm");
const ZBTC_MINT = new PublicKey("93a1L7xaEV7vZGt3jNMSQCgGjQx5WFYSm4CrS2s4KBcL");
const REWARD_TOKEN_MINT = new PublicKey(
  "chip6YRCCXMy1uLbGRNErT66aYGdaVsVCQ25VA1LWNN"
);
const INF_PRICE_ACCOUNT = new PublicKey(
  "Ceg5oePJv1a6RR541qKeQaTepvERA3i8SvyueX9tT8Sq"
);
const SOL_PRICE_ACCOUNT = new PublicKey(
  "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"
);

// Function to check if an account exists
const accountExists = async (address: PublicKey): Promise<boolean> => {
  try {
    const account = await connection.getAccountInfo(address);
    return account !== null;
  } catch (error) {
    return false;
  }
};

// Function to get quote from Jupiter API
const getQuote = async (
  fromMint: PublicKey,
  toMint: PublicKey,
  amount: number
) => {
  const response = await fetch(
    `${API_ENDPOINT}/quote?outputMint=${toMint.toBase58()}&inputMint=${fromMint.toBase58()}&amount=${amount}&slippage=0.5&onlyDirectRoutes=false`
  );
  return response.json();
};

// Function to get swap instructions from Jupiter API
const getSwapInstructions = async (
  user: PublicKey,
  inputTokenAccount: PublicKey,
  outputTokenAccount: PublicKey,
  quote: any
) => {
  const data = {
    quoteResponse: quote,
    userPublicKey: user.toBase58(),
    destinationTokenAccount: outputTokenAccount.toBase58(),
    sourceTokenAccount: inputTokenAccount.toBase58(),
    useSharedAccounts: true,
    config: {
      skipUserAccountsRpcCalls: true,
      wrapAndUnwrapSol: false,
      dynamicComputeUnitLimit: true,
    },
  };

  const response = await fetch(`${API_ENDPOINT}/swap-instructions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response.json();
};

// Function to distribute ZBTC rewards
const distributeZbtcReward = async (
  roundNumber: number,
  winners: Array<[string, number]>, // Array of [winnerAddress, percentage]
  swapAmount: number // Amount of INF to swap for ZBTC
): Promise<string> => {
  try {
    console.log(`Distributing ZBTC rewards for round ${roundNumber}...`);

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

    // Get the vault INF token account
    const vaultInfTokenAccount = await getAssociatedTokenAddress(
      INF_MINT,
      vaultAuthority,
      true, // Allow owner off curve (for PDAs)
      TOKEN_PROGRAM_ID
    );

    // Get the vault ZBTC token account
    const vaultZbtcTokenAccount = await getAssociatedTokenAddress(
      ZBTC_MINT,
      vaultAuthority,
      true, // Allow owner off curve (for PDAs)
      TOKEN_PROGRAM_ID
    );

    // Get the round reward token account
    const roundRewardTokenAccount = await getAssociatedTokenAddress(
      REWARD_TOKEN_MINT,
      roundPDA,
      true, // Allow owner off curve (for PDAs)
      TOKEN_PROGRAM_ID
    );

    // Log account information
    console.log(`Vault INF Token Account: ${vaultInfTokenAccount.toString()}`);
    console.log(
      `Vault ZBTC Token Account: ${vaultZbtcTokenAccount.toString()}`
    );
    console.log(
      `Round Reward Token Account: ${roundRewardTokenAccount.toString()}`
    );

    // Check vault INF token account balance
    try {
      const vaultInfBalance = await connection.getTokenAccountBalance(
        vaultInfTokenAccount
      );
      console.log(`Vault INF Balance: ${vaultInfBalance.value.uiAmount}`);

      if (
        vaultInfBalance.value.uiAmount === 0 ||
        vaultInfBalance.value.uiAmount < swapAmount
      ) {
        throw new Error(
          `Insufficient INF balance in vault. Available: ${vaultInfBalance.value.uiAmount}, Required: ${swapAmount}`
        );
      }
    } catch (err) {
      console.warn("Could not get vault INF token balance");
    }

    // Format winners for the instruction
    console.log("Winners:", winners);
    const winnerAddresses = winners.map(
      ([address, _]) => new PublicKey(address)
    );
    const winnerRatios = winners.map(([_, ratio]) => new BN(ratio));

    // Get Jupiter quote for INF to ZBTC swap
    console.log(`Getting Jupiter quote for ${swapAmount} INF to ZBTC...`);
    const quote = await getQuote(INF_MINT, ZBTC_MINT, swapAmount);

    if ("error" in quote) {
      console.error("Error getting quote:", quote.error);
      throw new Error(`Failed to get Jupiter quote: ${quote.error}`);
    }

    console.log(`Expected output: ${quote.outAmount} ZBTC`);

    // Get Jupiter swap instructions
    console.log("Getting Jupiter swap instructions...");
    const jupiterSwapInstructions = await getSwapInstructions(
      wallet.publicKey,
      vaultInfTokenAccount,
      vaultZbtcTokenAccount,
      quote
    );

    if ("error" in jupiterSwapInstructions) {
      console.error(
        "Error getting swap instructions:",
        jupiterSwapInstructions.error
      );
      throw new Error(
        `Failed to get Jupiter swap instructions: ${jupiterSwapInstructions.error}`
      );
    }

    // Get winner ZBTC token accounts
    console.log("Finding ZBTC token accounts for winners...");
    const winnerTokenAccounts = await Promise.all(
      winnerAddresses.map(async (address) => {
        const tokenAddress = await getAssociatedTokenAddress(
          ZBTC_MINT,
          address,
          false,
          TOKEN_PROGRAM_ID
        );
        console.log(
          `Winner ${address.toString()} ZBTC token account: ${tokenAddress.toString()}`
        );

        // Check if account exists
        const exists = await accountExists(tokenAddress);
        if (!exists) {
          console.warn(
            `Warning: Token account ${tokenAddress.toString()} does not exist.`
          );
          console.warn(
            "Make sure winners have ZBTC token accounts created before distribution."
          );
        }

        return {
          pubkey: tokenAddress,
          isWritable: true,
          isSigner: false,
        };
      })
    );

    // Extract Jupiter swap instruction data
    const { swapInstruction } = jupiterSwapInstructions;
    const jupiterSwapData = Buffer.from(swapInstruction.data, "base64");

    // Create the remaining accounts for Jupiter swap
    const jupiterRemainingAccounts = swapInstruction.accounts.map(
      (account: any) => ({
        pubkey: new PublicKey(account.pubkey),
        isWritable: account.isWritable,
        isSigner: account.isSigner,
      })
    );

    // Combine Jupiter accounts and winner token accounts for remaining accounts
    const allRemainingAccounts = [
      ...jupiterRemainingAccounts,
      ...winnerTokenAccounts,
    ];

    // Create the distribute ZBTC reward instruction
    console.log("Creating distribute ZBTC reward instruction...");
    const distributeZbtcRewardIx = await program.methods
      .distributeZbtcReward(
        roundNumberBN,
        winnerAddresses,
        winnerRatios,
        jupiterSwapData
      )
      .accounts({
        authority: wallet.publicKey,
        round: roundPDA,
        vaultData: vaultDataPDA,
        vaultInfTokenAccount: vaultInfTokenAccount,
        vaultZbtcTokenAccount: vaultZbtcTokenAccount,
        rewardMint: REWARD_TOKEN_MINT,
        roundRewardTokenAccount: roundRewardTokenAccount,
        vaultAuthority: vaultAuthority,
        infMint: INF_MINT,
        infMintProgram: TOKEN_PROGRAM_ID,
        zbtcMint: ZBTC_MINT,
        zbtcMintProgram: TOKEN_PROGRAM_ID,
        rewardMintProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        jupiterProgram: jupiterProgramId,
        priceUpdateInf: INF_PRICE_ACCOUNT,
        priceUpdateSol: SOL_PRICE_ACCOUNT,
      } as any)
      .remainingAccounts(allRemainingAccounts)
      .instruction();

    // Create a transaction with the distribute ZBTC reward instruction
    const transaction = new Transaction().add(distributeZbtcRewardIx);

    // Send and confirm the transaction
    console.log("Sending transaction...");
    const signature = await provider.sendAndConfirm(transaction, []);
    console.log(
      `ZBTC rewards successfully distributed for round ${roundNumber}! Signature: ${signature}`
    );

    // Print winner info
    console.log("\nZBTC Reward Distribution:");
    winners.forEach(([address, percentage]) => {
      console.log(`Address: ${address} - ${percentage}%`);
    });

    return signature;
  } catch (error) {
    console.error("Error distributing ZBTC rewards:", error);
    throw error;
  }
};

// Main function to parse command line arguments and execute
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3 || args[0] !== "distribute-zbtc") {
    console.log("Usage:");
    console.log(
      "  ts-node distributeZbtcReward.ts distribute-zbtc <round_number> <swap_amount> <winner1_address>:<ratio> <winner2_address>:<ratio> ..."
    );
    console.log("Example:");
    console.log(
      "  ts-node distributeZbtcReward.ts distribute-zbtc 2 1000000 ALiCeAddress123:60 BoBAddress456:40"
    );
    process.exit(1);
  }

  const roundNumber = parseInt(args[1]);
  if (isNaN(roundNumber)) {
    console.error("Invalid round number. Please provide a valid number.");
    process.exit(1);
  }

  const swapAmount = parseInt(args[2]);
  if (isNaN(swapAmount)) {
    console.error("Invalid swap amount. Please provide a valid number.");
    process.exit(1);
  }

  const winnerArgs = args.slice(3);
  if (winnerArgs.length === 0) {
    console.error("Please provide at least one winner with ratio.");
    process.exit(1);
  }

  // Parse winners and ratios
  const winners: Array<[string, number]> = [];
  let totalRatio = 0;

  for (const arg of winnerArgs) {
    const parts = arg.split(":");
    if (parts.length !== 2) {
      console.error(
        `Invalid winner format: ${arg}. Expected format: address:ratio`
      );
      process.exit(1);
    }

    const [address, ratioStr] = parts;
    const ratio = parseInt(ratioStr);

    if (isNaN(ratio) || ratio <= 0 || ratio > 100) {
      console.error(
        `Invalid ratio for ${address}: ${ratioStr}. Must be between 1 and 100.`
      );
      process.exit(1);
    }

    totalRatio += ratio;
    winners.push([address, ratio]);
  }

  if (totalRatio !== 100) {
    console.error(`Winner ratios must sum to 100%, got ${totalRatio}%`);
    process.exit(1);
  }

  try {
    await distributeZbtcReward(roundNumber, winners, swapAmount);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
