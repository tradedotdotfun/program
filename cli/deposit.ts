import {
  programAuthority,
  programWSOLAccount,
  provider,
  wallet,
  program,
  jupiterProgramId,
  connection,
  getAdressLookupTableAccounts,
  instructionDataToTransactionInstruction,
  vaultPDA,
  getAssociatedTokenAddressWithInstruction,
  rewardTokenMint,
} from "./helper";
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
} from "@solana/spl-token";
import {
  SystemProgram,
  TransactionMessage,
  PublicKey,
  VersionedTransaction,
  Transaction,
  LAMPORTS_PER_SOL,
  Connection,
  TransactionInstruction,
} from "@solana/web3.js";
import fetch from "node-fetch";
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "bn.js";

const API_ENDPOINT = "https://quote-api.jup.ag/v6";

const getQuote = async (
  fromMint: PublicKey,
  toMint: PublicKey,
  amount: number
) => {
  return fetch(
    `${API_ENDPOINT}/quote?outputMint=${toMint.toBase58()}&inputMint=${fromMint.toBase58()}&amount=${amount}&slippage=0.5&onlyDirectRoutes=true&excludeDexes=ORCA,OPENBOOK&maxAccounts=20`
  ).then((response) => response.json());
};

const getSwapIx = async (
  user: PublicKey,
  outputAccount: PublicKey,
  quote: any
) => {
  const data = {
    quoteResponse: quote,
    userPublicKey: user.toBase58(),
    // destinationTokenAccount: outputAccount.toBase58(),
    useSharedAccounts: true,
    // Match the Rust implementation's config
    config: {
      skipUserAccountsRpcCalls: true,
      wrapAndUnwrapSol: false,
      dynamicComputeUnitLimit: true,
      dynamicSlippage: {
        minBps: 50,
        maxBps: 1000,
      },
    },
  };

  return fetch(`${API_ENDPOINT}/swap-instructions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  }).then((response) => response.json());
};

const deserializeInstruction = (instruction) => {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    keys: instruction.accounts.map((key) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instruction.data, "base64"),
  });
};

const swapToINF = async (
  computeBudgetPayloads: any[],
  swapPayload: any,
  addressLookupTableAddresses: string[],
  inputTokenMint: PublicKey,
  outputTokenMint: PublicKey,
  vaultAuthority: PublicKey,
  amountSOLtoWrap: number,
  userInputTokenATA: PublicKey,
  roundNumber: number
) => {
  // Get swap instruction data
  let swapInstruction = instructionDataToTransactionInstruction(swapPayload);

  // Get token accounts for the vault and collect creation instructions if needed
  console.log("Setting up token accounts for the vault...");

  // Collection of ATA creation instructions
  let ataCreationInstructions: TransactionInstruction[] = [];

  // Get vault output token account
  const {
    address: vaultOutputTokenAccount,
    createInstruction: createVaultOutputTokenAccountIx,
  } = await getAssociatedTokenAddressWithInstruction(
    outputTokenMint,
    vaultAuthority
  );

  if (createVaultOutputTokenAccountIx) {
    ataCreationInstructions.push(createVaultOutputTokenAccountIx);
  }

  console.log(`Vault Output account: ${vaultOutputTokenAccount.toString()}`);

  // Get the modified accounts for the swap instruction
  const modifiedRemainingAccounts = swapInstruction.keys.map((account) => {
    // Let's preserve the original signer status for wallet.publicKey
    if (account.pubkey.equals(wallet.publicKey)) {
      console.log(
        `Account ${account.pubkey.toString()} is the wallet and should remain a signer`
      );
      return account;
    }

    // If it's the vault PDA in the remaining accounts, we need to let our program handle it with invoke_signed
    if (account.pubkey.equals(vaultPDA)) {
      console.log(
        `Found vault PDA in remaining accounts, keeping original signer status: ${account.isSigner}`
      );
      return { ...account, isSigner: false };
    }

    // The specific problematic account identified in the error
    if (
      account.pubkey.toString() ===
      "3dys2YRwFFWdyAXSd6HkG8aDUCYg2dxja5E3RrRNvAFn"
    ) {
      console.log(
        `Found problematic account ${account.pubkey.toString()}, forcing isSigner: false`
      );
      return {
        ...account,
        isSigner: false,
      };
    }

    return account;
  });

  const roundNumberBN = new BN(roundNumber);
  console.log(`Using round number: ${roundNumber}`);

  // Derive all PDAs first
  const [roundPDA] = await PublicKey.findProgramAddress(
    [Buffer.from("round"), roundNumberBN.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [userDataPDA] = await PublicKey.findProgramAddress(
    [Buffer.from("user_data"), wallet.publicKey.toBuffer()],
    program.programId
  );

  const [vaultDataPDA] = await PublicKey.findProgramAddress(
    [Buffer.from("vault_data")],
    program.programId
  );

  console.log(`Round PDA: ${roundPDA.toString()}`);
  console.log(`User Data PDA: ${userDataPDA.toString()}`);
  console.log(`Vault Data PDA: ${vaultDataPDA.toString()}`);
  console.log(
    `Vault Output Token Account: ${vaultOutputTokenAccount.toString()}`
  );

  // Get user reward token account and creation instruction if needed
  const {
    address: userRewardTokenAccount,
    createInstruction: createUserRewardTokenAccountIx,
  } = await getAssociatedTokenAddressWithInstruction(
    rewardTokenMint,
    wallet.publicKey
  );

  if (createUserRewardTokenAccountIx) {
    ataCreationInstructions.push(createUserRewardTokenAccountIx);
  }

  console.log(
    `User Reward Token Account: ${userRewardTokenAccount.toString()}`
  );

  // Check if user_data account exists
  const userDataAccount = await connection.getAccountInfo(userDataPDA);
  const vaultDataAccount = await connection.getAccountInfo(vaultDataPDA);

  console.log("User Data Account:", userDataAccount);
  console.log("Vault Data Account:", vaultDataAccount);

  const initializeUserDataIx = await program.methods
    .initializeUserData()
    .accounts({
      user: wallet.publicKey,
      userData: userDataPDA,
      systemProgram: SystemProgram.programId,
    } as any)
    .instruction();

  // Create the swap instruction with corrected account naming
  const swapIx = await program.methods
    .depositSol(roundNumberBN, swapInstruction.data)
    .accounts({
      user: wallet.publicKey,
      inputMint: inputTokenMint,
      inputMintProgram: TOKEN_PROGRAM_ID,
      outputMint: outputTokenMint,
      outputMintProgram: TOKEN_PROGRAM_ID,
      userInputTokenAccount: userInputTokenATA, // User's input token ATA
      vaultTokenAccount: vaultOutputTokenAccount,
      vaultAuthority: vaultAuthority,
      jupiterProgram: jupiterProgramId,
      // Add new reward token accounts
      rewardMint: rewardTokenMint,
      userRewardTokenAccount: userRewardTokenAccount,
      rewardMintProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      // Add user data account
      userData: userDataPDA,
      // Add vault data account
      vaultData: vaultDataPDA,
      // Add round account
      round: roundPDA,
    } as any)
    .remainingAccounts(modifiedRemainingAccounts)
    .instruction();

  // Create wrap instruction
  const wrapIx = SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: userInputTokenATA,
    lamports: amountSOLtoWrap,
  });

  // Create sync native instruction
  const syncNativeIx = createSyncNativeInstruction(userInputTokenATA);

  // Build the instructions array
  let instructions: TransactionInstruction[] = [];

  // Add initialization instructions first if needed
  if (!userDataAccount) {
    instructions.push(initializeUserDataIx);
  }

  console.log("ATA creation instructions:", ataCreationInstructions);
  // Add ATA creation instructions
  if (ataCreationInstructions.length > 0) {
    instructions = [...instructions, ...ataCreationInstructions];
  }

  // Add compute budget, wrap, sync, and swap instructions
  instructions = [
    ...instructions,
    ...computeBudgetPayloads.map(instructionDataToTransactionInstruction),
    wrapIx,
    syncNativeIx,
    swapIx,
  ];

  // Get the latest blockhash and create the transaction
  const blockhash = (await connection.getLatestBlockhash()).blockhash;
  const addressLookupTableAccounts = await getAdressLookupTableAccounts(
    addressLookupTableAddresses
  );

  console.log("Creating versioned transaction...");
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const transaction = new VersionedTransaction(messageV0);

  try {
    // Simulate the transaction first
    console.log("Simulating transaction...");
    const simulation = await provider.simulate(transaction, [wallet.payer]);
    console.log("Simulation result:", simulation.logs);

    // If simulation is successful, send the transaction
    console.log("Sending transaction...");
    const txID = await provider.sendAndConfirm(transaction, [wallet.payer]);
    console.log(`Transaction successful! TxID: ${txID}`);
  } catch (e) {
    console.error("Transaction failed:", e);
    if (e.simulationResponse) {
      console.log("Simulation response logs:", e.simulationResponse.logs);
    }
  }
};

// Main
(async () => {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let roundNumber = 1; // Default value

  // Check if round number is provided as command line argument
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--round" || args[i] === "-r") {
      if (i + 1 < args.length) {
        const parsed = parseInt(args[i + 1]);
        if (!isNaN(parsed)) {
          roundNumber = parsed;
        } else {
          console.error(
            "Invalid round number provided. Using default round 1."
          );
        }
      }
    }
  }

  console.log(`Using round number: ${roundNumber}`);

  const SOL = new PublicKey("So11111111111111111111111111111111111111112");
  const INF = new PublicKey("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm");

  const [vaultAuthority, _] = await PublicKey.findProgramAddress(
    [Buffer.from("vault_authority")],
    program.programId
  );

  console.log(`Vault authority: ${vaultAuthority.toString()}`);

  const amountToWrap = 1_000_000; // 0.001 SOL in lamports (1 SOL = 1,000,000,000 lamports)

  // Find the best Quote from the Jupiter API - 1 USDC = 1,000,000 (6 decimals)
  const quote = await getQuote(SOL, INF, amountToWrap);

  // Get token accounts (but don't create them yet, just get addresses and creation instructions if needed)
  console.log("Setting up token accounts...");
  const { address: inputTokenATA, createInstruction: createInputTokenATAIx } =
    await getAssociatedTokenAddressWithInstruction(SOL, wallet.publicKey);

  console.log(`WSOL account: ${inputTokenATA.toString()}`);
  console.log(`Vault PDA: ${vaultPDA.toString()}`);

  // Find the vault output token account address for Jupiter API (don't create it yet)
  const vaultOutputTokenAddress = await getAssociatedTokenAddress(
    INF,
    vaultAuthority,
    true // Allow owner off curve (for PDAs)
  );

  // Use direct fetch rather than our helper to have more control
  const jupResponse = await fetch(`${API_ENDPOINT}/swap-instructions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
      destinationTokenAccount: vaultOutputTokenAddress.toBase58(),
      sourceTokenAccount: inputTokenATA.toBase58(),
      useSharedAccounts: true,
      config: {
        skipUserAccountsRpcCalls: true, // Skip unnecessary RPC calls
        wrapAndUnwrapSol: false, // Don't wrap/unwrap SOL - we're handling that
        dynamicComputeUnitLimit: false, // Don't use dynamic compute limit
        prioritizationFeeLamports: 0,
        maxRetries: 0, // Don't retry internally
        useTokenLedger: false, // Don't use token ledger
        useSharedAccounts: true, // Use shared accounts
        asLegacyTransaction: false, // Use versioned transactions
        strictTokenAccounts: true, // Be strict about token accounts
      },
    }),
  }).then((response) => response.json());

  if ("error" in jupResponse) {
    console.log({ result: jupResponse });
    return jupResponse;
  }

  const {
    computeBudgetInstructions, // The necessary instructions to setup the compute budget.
    swapInstruction: swapInstructionPayload, // The actual swap instruction.
    addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
  } = jupResponse;

  await swapToINF(
    computeBudgetInstructions,
    swapInstructionPayload,
    addressLookupTableAddresses,
    SOL,
    INF,
    vaultAuthority,
    amountToWrap,
    inputTokenATA,
    roundNumber
  );
})();
