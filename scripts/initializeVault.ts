import { loadProgram } from "./utils";
import { TradeFun } from "../target/types/trade_fun";
import * as anchor from "@coral-xyz/anchor";

async function main() {
    const program = (await loadProgram()) as anchor.Program<TradeFun>;
    const provider = program.provider as anchor.AnchorProvider;

    // Define vault parameters
    const rewardRatios = [new anchor.BN(99)]; // Example: 3 winners (must sum with platformFee to 100)
    const platformFee = new anchor.BN(1); // 10% platform fee

    // Find the PDAs for vault accounts
    const [adminConfigPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("admin_config")],
        program.programId
    );
    const [vaultDataPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault_data")],
        program.programId
    );
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        program.programId
    )

    try {
        // Send transaction to initialize the vault
        const tx: string = await program.methods.initializeVault(rewardRatios, platformFee).
            accounts({
                adminConfig: adminConfigPDA,
                vaultData: vaultDataPDA,
                vault: vaultPDA,
                admin: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            } as any)
            .rpc();

        console.log("✅ Vault initialized successfully!");
        console.log("📜 Transaction Signature:", tx);
        console.log("🔑 VaultData PDA:", vaultDataPDA.toBase58());
        console.log("🏦 Vault PDA:", vaultPDA.toBase58());
    } catch (error) {
        console.error("❌ Error initializing vault:", error);
    }
}

main().catch(console.error);
