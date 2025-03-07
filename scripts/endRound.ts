import { TradeFun } from "../target/types/trade_fun"; // Ensure this path is correct
import { loadProgram } from "./utils";
import * as anchor from "@coral-xyz/anchor";

async function main() {
    const program = (await loadProgram()) as anchor.Program<TradeFun>;
    const provider = program.provider as anchor.AnchorProvider;

    // Find the PDAs for VaultData and Vault
    const [vaultDataPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault_data")],
        program.programId
    );
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        program.programId
    );

    try {
        // Send transaction to end the round
        const tx: string = await program.methods
            .endRound()
            .accounts({
                vaultData: vaultDataPDA,
                vault: vaultPDA,
                admin: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            } as any)
            .rpc();

        console.log("✅ League round ended successfully!");
        console.log("📜 Transaction Signature:", tx);
        console.log("🏦 Vault PDA:", vaultPDA.toBase58());
    } catch (error) {
        console.error("❌ Error ending the round:", error);
    }
}

main().catch(console.error);
