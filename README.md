Here’s an updated **README** including the **TypeScript scripts** you created today for interacting with your Solana program.  

---

# 🏆 Trade.fun

## 📌 Overview
**Trade.fun** is a **paper trading competition smart contract** on Solana that allows users to:
- Participate in a simulated **trading competition**.
- Deposit **SOL** into a **vault** while a round is running.
- Distribute rewards based on **predefined reward ratios**.
- Charge a **platform fee** that is collected by the admin.
- Support **dynamic updates** to platform fees and reward distributions.

This is a **Solana program written in Rust** using the **Anchor framework**.

---

## 🔥 Features
✅ **Admin-Managed Vault** – Only the admin can create & manage competitions.  
✅ **Deposits Only When Active** – Users can deposit SOL only when the round is active.  
✅ **Dynamic Reward Distribution** – SOL is split among winners based on preset ratios.  
✅ **Admin-Controlled Fees** – The admin collects a fee from the vault.  
✅ **Upgradeable Vault Settings** – The admin can change **reward ratios & fees** anytime.  
✅ **Fully Tested** – Includes **comprehensive unit tests** in TypeScript.  
✅ **TypeScript CLI Scripts** – Easily interact with the program using scripts.  

---

## 🛠️ How It Works

### 🔑 **Roles**
- **Admin**: The owner of the vault (stored in an **AdminConfig PDA**) who manages competitions.
- **Users**: Participants who deposit SOL into the vault.

### 📂 **Main Accounts**
| Account       | PDA Seed         | Purpose |
|--------------|----------------|----------|
| `AdminConfig` | `admin_config` | Stores the **admin's public key** |
| `VaultData`   | `vault_data` | Stores **reward settings & competition status** |
| `Vault`       | `vault` | The **SOL storage account** for deposits & rewards |

### 🔄 **Lifecycle**
1. **Admin initializes** the vault.
2. **Admin starts** a new round.
3. **Users deposit SOL** while the round is active.
4. **Admin ends** the round, collecting the platform fee.
5. **Admin distributes rewards** among winners.

---

## 🚀 Setup & Installation

### **1️⃣ Install Dependencies**
Ensure you have:
- **Rust & Solana CLI** installed:  
  ```sh
  curl -sSf https://raw.githubusercontent.com/solana-labs/solana/v1.16.2/install | sh
  ```
- **Anchor framework** installed:  
  ```sh
  cargo install --git https://github.com/coral-xyz/anchor avm --locked
  avm install latest
  avm use latest
  ```

### **2️⃣ Clone & Build**
```sh
git clone https://github.com/your-repo/trade-fun.git
cd trade-fun
anchor build
```

### **3️⃣ Deploy to Localnet**
```sh
solana-test-validator
```
```sh
anchor deploy
```

---

## ⚡ Usage

### **📜 TypeScript Scripts for Interacting with the Program**
We've created **TypeScript CLI scripts** that allow you to call program methods from your **local wallet**.

### **1️⃣ Install Dependencies**
Before running the scripts, make sure you have **Node.js**, **TypeScript**, and **Anchor dependencies** installed:

```sh
npm install @solana/web3.js @coral-xyz/anchor ts-node
```

---

### **2️⃣ Initialize Admin**
**Admin must be set up before using the vault.**
```sh
ts-node scripts/initializeAdmin.ts
```
✅ **Sets the admin for managing the vault.**

---

### **3️⃣ Initialize Vault**
**The vault must be initialized before a round starts.**
```sh
ts-node scripts/initializeVault.ts
```
✅ **Creates the vault, sets reward ratios, and defines the platform fee.**  

---

### **4️⃣ Start a New Round**
**Users can deposit SOL only when a round is active.**
```sh
ts-node scripts/startRound.ts
```
✅ **Marks the vault as active for deposits.**

---

### **5️⃣ Deposit SOL**
**Users deposit SOL while the round is active.**
```sh
ts-node scripts/depositSol.ts
```
✅ **Deposits 1 SOL into the vault.**  
🛠️ **Modify the script if you want to deposit a different amount.**

---

### **6️⃣ End the Round & Collect Fees**
**Stops new deposits and collects platform fees.**
```sh
ts-node scripts/endRound.ts
```
✅ **Ends the round and collects platform fees from the vault.**

---

### **7️⃣ Distribute Rewards**
**Rewards are distributed to winners.**
```sh
ts-node scripts/distributeSol.ts
```
✅ **Distributes SOL to predefined winners.**  
💰 **Modify the script if you want to distribute SOL to yourself.**  

---

## 🏗️ Program Structure

### **Vault Initialization**
```rust
pub fn initialize_vault(
    ctx: Context<InitializeVault>,
    reward_ratios: Vec<u64>,
    platform_fee: u64,
) -> Result<()> { ... }
```
✔️ Only **admin** can initialize.  
✔️ **Checks sum of reward_ratios + fee = 100%**.  

---

### **Depositing SOL**
```rust
pub fn deposit_sol(ctx: Context<DepositSol>) -> Result<()> { ... }
```
✔️ **Only allowed if round is active**.  

---

### **Ending a Round & Collecting Fees**
```rust
pub fn end_round(ctx: Context<EndRound>) -> Result<()> { ... }
```
✔️ **Admin stops deposits & collects platform fees.**  

---

### **Distributing Rewards**
```rust
pub fn distribute_sol(ctx: Context<DistributeSol>) -> Result<()> { ... }
```
✔️ **Distributes SOL dynamically based on reward ratios.**  
✔️ **Supports distributing SOL to yourself.**  

---

## 🛠️ Development & Testing

### **Run Local Tests**
```sh
anchor test
```

### **Filter Specific Tests**
Run tests for a specific function:
```sh
anchor test --filter "User deposits 0.1 SOL"
```

---

## 📜 **Checking Account Balances**
After transactions, you can check balances:

### **Check Your Wallet Balance**
```sh
solana balance
```

### **Check Vault Balance**
```sh
solana account <VAULT_PDA>
```

---

## 📡 **Verifying Transactions**
To confirm any transaction:
```sh
solana confirm -v <TRANSACTION_SIGNATURE>
```

---

## 🛠️ **Troubleshooting**
### **"Command not found: ts-node"**
Run:
```sh
npm install -g ts-node
```
Or use:
```sh
npx ts-node scripts/<your-script>.ts
```

### **Vault Doesn’t Have Enough SOL**
Make sure the vault is funded before distribution:
```sh
solana balance <VAULT_PDA>
```

