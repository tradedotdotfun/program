import { TradeFun } from "../target/types/trade_fun"; // Ensure this path is correct
import { loadProgram } from "./utils";
import * as anchor from "@coral-xyz/anchor";

async function main() {
    const program = (await loadProgram()) as anchor.Program<TradeFun>;
    const provider = program.provider as anchor.AnchorProvider;

    // Find the PDA for the VaultData account
    const [vaultDataPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault_data")],
        program.programId
    );

    try {
        // Send transaction to start the round
        const tx: string = await program.methods
            .startRound()
            .accounts({
                vaultData: vaultDataPDA,
                admin: provider.wallet.publicKey,
            } as any)
            .rpc();

        console.log("✅ League round started successfully!");
        console.log("📜 Transaction Signature:", tx);
        console.log("🔑 VaultData PDA:", vaultDataPDA.toBase58());
    } catch (error) {
        console.error("❌ Error starting the round:", error);
    }
}

main().catch(console.error);
