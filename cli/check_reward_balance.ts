import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { wallet, connection, rewardTokenMint } from "./helper";

// Add reward token mint constant

// Function to check reward token balance
const checkRewardBalance = async (): Promise<number> => {
  try {
    console.log("Checking reward token balance...");

    // Get user reward token account
    const userRewardTokenAccount = await getAssociatedTokenAddress(
      rewardTokenMint,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    console.log(`User Wallet: ${wallet.publicKey.toString()}`);
    console.log(`Reward Token Mint: ${rewardTokenMint.toString()}`);
    console.log(
      `User Reward Token Account: ${userRewardTokenAccount.toString()}`
    );

    try {
      // Get the token account balance
      const tokenAccountInfo = await connection.getTokenAccountBalance(
        userRewardTokenAccount
      );
      const balance = tokenAccountInfo.value.uiAmount;
      console.log(`Reward token balance: ${balance}`);
      return balance;
    } catch (e) {
      console.log("No reward token account found or zero balance.");
      return 0;
    }
  } catch (error) {
    console.error("Error checking reward balance:", error);
    return 0;
  }
};

// Main
(async () => {
  await checkRewardBalance();
})();
