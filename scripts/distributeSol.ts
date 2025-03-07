import { TradeFun } from "../target/types/trade_fun"; // Ensure this path is correct
import { loadProgram } from "./utils";
import * as anchor from "@coral-xyz/anchor";

async function main() {
    const program = (await loadProgram()) as anchor.Program<TradeFun>;
    const provider = program.provider as anchor.AnchorProvider;

    // Find the PDAs for Vault and VaultData
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        program.programId
    );
    const [vaultDataPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault_data")],
        program.programId
    );

    // Use your own wallet as the recipient
    const myWallet = provider.wallet.publicKey;

    try {
        // Send transaction to distribute SOL to yourself
        const tx: string = await program.methods
            .distributeSol()
            .accounts({
                admin: myWallet, // Admin who initiates the transaction
                vault: vaultPDA,
                vaultData: vaultDataPDA,
                systemProgram: anchor.web3.SystemProgram.programId,
            } as any)
            .remainingAccounts([
                { pubkey: myWallet, isWritable: true, isSigner: false }, // Distribute SOL to yourself
            ])
            .rpc();

        console.log("✅ Successfully distributed SOL to myself!");
        console.log("📜 Transaction Signature:", tx);
        console.log("🏦 Vault PDA:", vaultPDA.toBase58());
        console.log("💰 My Wallet:", myWallet.toBase58());
    } catch (error) {
        console.error("❌ Error distributing SOL:", error);
    }
}

main().catch(console.error);
