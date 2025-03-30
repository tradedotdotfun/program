import { TradeFun } from "../target/types/trade_fun";
import { loadProgram } from "./utils";
import * as anchor from "@coral-xyz/anchor";

async function main() {
  const program = (await loadProgram()) as unknown as anchor.Program<TradeFun>;
  const provider = program.provider as anchor.AnchorProvider;

  // Find the PDA for the AdminConfig account
  const [adminConfigPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("admin_config")],
    program.programId
  );

  try {
    // Import the program types
    const tx = await program.methods
      .initializeAdmin()
      .accounts({
        adminConfig: adminConfigPDA,
        admin: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .rpc();

    console.log("✅ Admin initialized successfully!");
    console.log("📜 Transaction Signature:", tx);
    console.log("🔑 AdminConfig PDA:", adminConfigPDA.toBase58());
  } catch (error) {
    console.error("❌ Error initializing admin:", error);
  }
}

main().catch(console.error);
