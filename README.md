# 🏆 Trade.fun

## 📌 Overview
Welcome to **Trade.fun**, a **paper trading competition smart contract** on Solana! Our goal is to provide a fun and competitive environment where users can:
- **Participate** in simulated trading competitions.
- **Deposit SOL** into a vault during active rounds.
- **Win rewards** distributed based on a predefined ratio.
- **Collect platform fees** as an admin.
- **Update reward distributions & fees** dynamically.

Built on Solana using the **Anchor framework**, Trade.fun makes paper trading competitive, transparent, and rewarding.

---

## 🛠️ How It Works

### 🔑 **Roles**
- **Admin**: Manages the vault and competitions.
- **Users**: Participate by depositing SOL during active rounds.

### 📂 **Main Accounts**
| Account       | PDA Seed         | Purpose |
|--------------|----------------|----------|
| `AdminConfig` | `admin_config` | Stores admin details |
| `VaultData`   | `vault_data` | Holds reward settings & round status |
| `Vault`       | `vault` | Stores SOL for deposits & rewards |

### 🔄 **Lifecycle**
1. **Admin initializes** the vault.
2. **Admin starts** a new round.
3. **Users deposit SOL** during the round.
4. **Admin ends** the round and collects the platform fee.
5. **Admin distributes rewards** to winners.

---

## 🚀 Setup & Installation

### **1️⃣ Install Dependencies**
- Install **Rust & Solana CLI**:  
  ```sh
  curl -sSf https://raw.githubusercontent.com/solana-labs/solana/v1.16.2/install | sh
  ```
- Install **Anchor framework**:  
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

## ⚡ Using Trade.fun

### **📜 TypeScript CLI Scripts**
We've included **TypeScript scripts** to easily interact with the program.

### **1️⃣ Install Dependencies**
```sh
npm install @solana/web3.js @coral-xyz/anchor ts-node
```

### **2️⃣ Initialize Admin**
```sh
ts-node scripts/initializeAdmin.ts
```
✅ **Registers the admin for managing the vault.**

### **3️⃣ Initialize Vault**
```sh
ts-node scripts/initializeVault.ts
```
✅ **Creates the vault and sets reward ratios & platform fee.**

### **4️⃣ Start a New Round**
```sh
ts-node scripts/startRound.ts
```
✅ **Activates the vault for deposits.**

### **5️⃣ Deposit SOL**
```sh
ts-node scripts/depositSol.ts
```
✅ **Deposits 1 SOL into the vault.**  
🛠️ **Modify the script to deposit a different amount.**

### **6️⃣ End the Round & Collect Fees**
```sh
ts-node scripts/endRound.ts
```
✅ **Stops deposits and collects platform fees.**

### **7️⃣ Distribute Rewards**
```sh
ts-node scripts/distributeSol.ts
```
✅ **Rewards winners based on preset ratios.**  
💰 **Modify the script if you want to distribute SOL differently.**

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
✔️ **Only admin** can initialize.  
✔️ **Ensures reward ratios + fee = 100%**.  

### **Depositing SOL**
```rust
pub fn deposit_sol(ctx: Context<DepositSol>) -> Result<()> { ... }
```
✔️ **Only possible when a round is active.**

### **Ending a Round & Collecting Fees**
```rust
pub fn end_round(ctx: Context<EndRound>) -> Result<()> { ... }
```
✔️ **Stops deposits & collects platform fees.**

### **Distributing Rewards**
```rust
pub fn distribute_sol(ctx: Context<DistributeSol>) -> Result<()> { ... }
```
✔️ **Rewards winners dynamically based on ratios.**  
✔️ **Supports custom distributions.**

---

## 🌟 Upcoming Features

### 🔐 **zk-Compression for Transparent Winner Selection**
We are integrating **zk-compression** to provide an **on-chain, verifiable** way to determine winners, ensuring fairness and transparency.

### 💰 **JitoSOL Staking to Generate Passive Rewards**
User deposits will be automatically **staked in JitoSOL**, allowing them to earn **yield** while participating in trading competitions. The staking rewards will be distributed to participants.

### 🪽 **Angel Mode: Yield-Based Betting with Locked JitoSOL**
We are introducing a **new trading mode** where users can **bet using only the yield** generated from their staked JitoSOL instead of their principal SOL. Here's how it works:
- Users **stake SOL in JitoSOL**, locking it for a predefined period.
- The **yield generated** from the staked SOL can be used for betting.
- Users can participate in competitions **without risking their principal**.
- Users can **use future yield** for betting **immediately** after locking their SOL, meaning they don’t have to wait for the yield to accumulate before placing bets.
- The actual yield will **unlock over time**, ensuring continuous engagement in the platform.
- After the locked period ends, users can **withdraw their original SOL** while keeping any additional rewards earned from yield-based bets.

This feature enables **risk-free betting**, as users are only wagering the interest earned rather than their initial deposit, while also allowing **immediate betting** with future expected yield.

### ⚔️ **1:1 PvP Trading Battles**
Users can challenge each other to **head-to-head trading battles**, where both players deposit SOL, and the winner takes the pot minus platform fees.

### 🏛️ **DAO-Driven Competitions & DAO vs. DAO Battles**
Users will be able to **create DAOs** to compete against other communities, with custom reward structures and governance mechanisms.

Additionally, we are introducing **DAO vs. DAO trading battles**, where decentralized communities can challenge each other in structured competitions. Each DAO will be able to:
- Form teams and set strategic trading goals.
- Compete against rival DAOs in time-based or performance-based trading battles.
- Earn rewards based on collective performance and strategy.
- Implement governance mechanisms to distribute winnings among DAO members.

This feature will create a **collaborative and competitive ecosystem** where DAOs can engage in strategic trading, strengthening community engagement and participation.

### 🔄 **Copy Trading with Real-World Perp Integration**
We are bringing **real-world perpetual trading** into the platform by introducing **Copy Trading**, allowing users to **follow top traders' positions** automatically.  
- This will be using the **Raydium Perp DEX** and **Drift DEX** programs on Solana.
- Users can **subscribe to experienced traders** and mirror their trades in real-time.  
- The system integrates **real-world perpetual contracts**, ensuring accurate position tracking.  
- **Top traders can earn fees** from their followers, incentivizing high-performance trading strategies.  

This feature allows both beginners and passive investors to participate in trading without needing deep market expertise while enabling skilled traders to **monetize their strategies**.

### 🎟️ **Lottery System for Non-Winners**
To keep participation exciting, users who don’t win in competitions will be **entered into a lottery**, giving them a second chance at earning rewards.

### 🤖 **AI-Powered Trading Agents**
Players will be able to **deploy AI trading agents** to compete in trading rounds. Users can either train their own AI or bet on AI agents with predefined strategies.

