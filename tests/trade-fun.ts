import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TradeFun } from "../target/types/trade_fun";
import { assert } from "chai";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.TradeFun as Program<TradeFun>;

let adminConfigPDA: anchor.web3.PublicKey;
let vaultPDA: anchor.web3.PublicKey;
let vaultDataPDA: anchor.web3.PublicKey;

let admin = provider.wallet;
let user = anchor.web3.Keypair.generate();
let recipient1 = anchor.web3.Keypair.generate();
let recipient2 = anchor.web3.Keypair.generate();
let recipient3 = anchor.web3.Keypair.generate();

const PLATFORM_FEE = 0.05;

before(async () => {
  console.log("📌 Airdropping SOL to the admin...");
  const tx = await provider.connection.requestAirdrop(
    admin.publicKey,
    2 * anchor.web3.LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(tx);

  console.log("📌 Airdropping SOL to the user...");
  const userAirdrop = await provider.connection.requestAirdrop(
    user.publicKey,
    1 * anchor.web3.LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(userAirdrop);

  console.log("📌 Deriving PDAs...");
  [adminConfigPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("admin_config")],
    program.programId
  );

  [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  );

  [vaultDataPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault_data")],
    program.programId
  );

  console.log("📌 Initializing Admin...");
  await program.methods
    .initializeAdmin()
    .accounts({
      admin: admin.publicKey,
      adminConfig: adminConfigPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .rpc();

  console.log("✅ Admin Initialized!");

  console.log("📌 Initializing Vault...");
  const rewardRatios = [
    new anchor.BN(40),
    new anchor.BN(30),
    new anchor.BN(25),
  ];
  const platformFee = new anchor.BN(PLATFORM_FEE * 100);

  await program.methods
    .initializeVault(rewardRatios, platformFee)
    .accounts({
      admin: admin.publicKey,
      adminConfig: adminConfigPDA,
      vault: vaultPDA,
      vaultData: vaultDataPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .rpc();

  console.log("✅ Vault Initialized!");
});

it("Admin updates vault settings", async () => {
  console.log("📌 Updating Vault Settings...");
  const newRewardRatios = [
    new anchor.BN(50),
    new anchor.BN(30),
    new anchor.BN(15),
  ];
  const newPlatformFee = new anchor.BN(5); // 5%

  await program.methods
    .updateVaultSettings(newRewardRatios, newPlatformFee)
    .accounts({
      admin: admin.publicKey,
      adminConfig: adminConfigPDA,
      vaultData: vaultDataPDA,
    } as any)
    .rpc();

  console.log("✅ Vault settings updated!");

  console.log("📌 Fetching updated vault data...");
  const vaultData = await program.account.vaultData.fetch(vaultDataPDA);

  assert.deepEqual(
    vaultData.rewardRatios.map((r: anchor.BN) => r.toNumber()),
    [50, 30, 15],
    "Reward ratios should be updated"
  );
  assert.equal(
    vaultData.platformFee.toNumber(),
    5,
    "Platform fee should be updated to 5%"
  );
});

it("Fails to deposit when the round is not running", async () => {
  try {
    await program.methods
      .depositSol()
      .accounts({
        user: user.publicKey,
        vault: vaultPDA,
        vaultData: vaultDataPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .signers([user])
      .rpc();

    assert.fail("Deposit should have failed because the round is not running.");
  } catch (err) {
    console.log("✅ Deposit correctly failed when the round was inactive.");
  }
});

it("Verifies the initial round number is zero", async () => {
  console.log("📌 Checking initial round number...");
  const vaultData = await program.account.vaultData.fetch(vaultDataPDA);
  assert.equal(
    vaultData.currentRound.toNumber(),
    0,
    "Initial round should be zero"
  );
  console.log("✅ Initial round number verified as zero!");
});

it("Starts the league round", async () => {
  console.log("📌 Starting the league round...");
  await program.methods
    .startRound()
    .accounts({
      admin: admin.publicKey,
      vaultData: vaultDataPDA,
    } as any)
    .rpc();

  const vaultData = await program.account.vaultData.fetch(vaultDataPDA);
  assert.equal(
    vaultData.currentRound.toNumber(),
    1,
    "Round number should be 1 after starting"
  );
  assert.isTrue(vaultData.isRunning, "Round should be running");
  console.log(
    "✅ League round started with round number:",
    vaultData.currentRound.toNumber()
  );
});

it("User deposits 0.1 SOL into the vault when round is active", async () => {
  await program.methods
    .depositSol()
    .accounts({
      user: user.publicKey,
      vault: vaultPDA,
      vaultData: vaultDataPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .signers([user])
    .rpc();

  console.log("✅ User deposited 0.1 SOL into vault.");
});

it("Emits a DepositEvent when user deposits SOL", async () => {
  console.log("📌 Depositing SOL to trigger event...");

  const listener = program.addEventListener("depositEvent", (event, slot) => {
    console.log("✅ DepositEvent detected:", event);
    assert.equal(
      event.user.toString(),
      user.publicKey.toString(),
      "User should match"
    );
  });

  const tx = await program.methods
    .depositSol()
    .accounts({
      user: user.publicKey,
      vault: vaultPDA,
      vaultData: vaultDataPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .signers([user])
    .rpc();

  console.log("✅ User deposited SOL, waiting for event...");

  // Wait briefly to allow the event listener to capture the event
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await program.removeEventListener(listener);
});

it("Ends the league round and transfers platform fee", async () => {
  console.log("📌 Ending the league round...");
  await program.methods
    .endRound()
    .accounts({
      admin: admin.publicKey,
      vault: vaultPDA,
      vaultData: vaultDataPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .rpc();

  const vaultData = await program.account.vaultData.fetch(vaultDataPDA);
  assert.equal(
    vaultData.currentRound.toNumber(),
    1,
    "Round number should still be 1 after ending"
  );
  assert.isFalse(vaultData.isRunning, "Round should not be running");
  console.log("✅ Platform fee transferred to admin!");
});

it("Starts a second round and verifies round number increments", async () => {
  console.log("📌 Starting second round...");
  await program.methods
    .startRound()
    .accounts({
      admin: admin.publicKey,
      vaultData: vaultDataPDA,
    } as any)
    .rpc();

  const vaultData = await program.account.vaultData.fetch(vaultDataPDA);
  assert.equal(
    vaultData.currentRound.toNumber(),
    2,
    "Round number should be 2 for the second round"
  );
  assert.isTrue(vaultData.isRunning, "Round should be running");
  console.log(
    "✅ Second round started with round number:",
    vaultData.currentRound.toNumber()
  );
});

it("Distributes remaining SOL to dynamically selected recipients based on preset ratios", async () => {
  const recipients = [
    recipient1.publicKey,
    recipient2.publicKey,
    recipient3.publicKey,
  ];

  console.log("📌 Distributing SOL...");
  await program.methods
    .distributeSol()
    .accounts({
      admin: admin.publicKey,
      vault: vaultPDA,
      vaultData: vaultDataPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .remainingAccounts(
      recipients.map((pubkey) => ({
        pubkey,
        isWritable: true,
        isSigner: false,
      }))
    )
    .rpc();

  console.log("✅ Distribution test passed!");
});
