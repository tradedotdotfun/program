import * as anchor from "@coral-xyz/anchor";
import * as dotenv from "dotenv";
import { Program, Wallet, AnchorProvider } from "@coral-xyz/anchor";
import TradDotFunJSON from "../target/idl/trade_dot_fun.json";
import { TradeDotFun } from "../target/types/trade_dot_fun";
import {
  PublicKey,
  Keypair,
  Connection,
  AddressLookupTableAccount,
  TransactionInstruction,
} from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

dotenv.config();

console.log(process.env.RPC_URL);

export const programId = new PublicKey(
  "B1ph2kyNtkhscRQ3R1CAwMNM4PbGGvphHTzxR83kRsRc"
);
export const jupiterProgramId = new PublicKey(
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
);
export const wallet = new Wallet(
  Keypair.fromSecretKey(bs58.decode(process.env.KEYPAIR))
);

export const connection = new Connection(process.env.RPC_URL);
export const provider = new AnchorProvider(connection, wallet, {
  commitment: "processed",
});
anchor.setProvider(provider);

export const program = new Program(
  TradDotFunJSON as unknown as anchor.Idl,
  provider
) as unknown as Program<TradeDotFun>;

const findProgramAuthority = (): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("authority")],
    programId
  )[0];
};
export const programAuthority = findProgramAuthority();

const findVaultPDA = (): PublicKey => {
  return PublicKey.findProgramAddressSync([Buffer.from("vault")], programId)[0];
};
export const vaultPDA = findVaultPDA();

const findProgramWSOLAccount = (): PublicKey => {
  return PublicKey.findProgramAddressSync([Buffer.from("wsol")], programId)[0];
};
export const programWSOLAccount = findProgramWSOLAccount();

export const findAssociatedTokenAddress = ({
  walletAddress,
  tokenMintAddress,
}: {
  walletAddress: PublicKey;
  tokenMintAddress: PublicKey;
}): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      walletAddress.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      tokenMintAddress.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
};

export const getAdressLookupTableAccounts = async (
  keys: string[]
): Promise<AddressLookupTableAccount[]> => {
  const addressLookupTableAccountInfos =
    await connection.getMultipleAccountsInfo(
      keys.map((key) => new PublicKey(key))
    );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }

    return acc;
  }, new Array<AddressLookupTableAccount>());
};

export const instructionDataToTransactionInstruction = (
  instructionPayload: any
) => {
  if (instructionPayload === null) {
    return null;
  }

  return new TransactionInstruction({
    programId: new PublicKey(instructionPayload.programId),
    keys: instructionPayload.accounts.map((key) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instructionPayload.data, "base64"),
  });
};

export const rewardTokenMint = new PublicKey(
  "chip6YRCCXMy1uLbGRNErT66aYGdaVsVCQ25VA1LWNN"
);

export const getAssociatedTokenAddressWithInstruction = async (
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
    return { address: associatedTokenAddress, createInstruction: null };
  } catch (error) {
    console.log(
      `Token account ${associatedTokenAddress.toString()} for ${mint.toString()} needs to be created`
    );

    // Return the instruction to create the token account, but don't execute it yet
    const instruction = createAssociatedTokenAccountInstruction(
      wallet.publicKey, // payer
      associatedTokenAddress, // associated token account address
      owner, // owner
      mint // mint,
    );

    return { address: associatedTokenAddress, createInstruction: instruction };
  }
};
