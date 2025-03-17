# 🏆 Trade.fun

## 🚀 What is Trade.fun?
Trade.fun is an **influencer-driven trading game** built on **Sonic**, designed to make trading competitions more **transparent, engaging, and rewarding**. Whether you're a seasoned trader or just starting out, **Trade.fun** offers an exciting way to showcase your skills, earn rewards, and build a trading community.

### 🔥 Why Choose Trade.fun?
- **Showcase & Monetize** → Influencers can prove their trading expertise and earn from it.
- **On-Chain Transparency** → All performance data is verifiable, ensuring fairness and accountability.
- **Community-Driven** → Build DAOs, launch influence tokens, and compete at the highest level.

---

## 🔑 Core Features

### 📈 Trading Competitions
- Users deposit **SOL** to enter active rounds.
- All trades are **recorded on-chain** for full transparency.
- Rewards are **distributed based on trading performance**.
- **Top performers** can form DAOs and **tokenize their influence**.

### 🏛 DAO Integration
- **Earn a reputation?** Create a **trading DAO**.
- **Launch tradable influence tokens**, allowing others to invest in your success.
- **Access private insights & privileged copy trading** by joining influencer DAOs.
- **Engage in DAO vs. DAO trading battles**, leveraging collective strategies.

### 😇 Angel Mode – No-Risk Betting
- Bet using **yield** from **LST SOL** instead of risking your principal.
- Participate in competitions with **future expected yield**.
- **Yield unlocks gradually**, keeping your original SOL safe.
- Withdraw your **original SOL** after a set lock period.

### 🤖 AI-Powered Trading
- Deploy **AI trading agents** trained to execute winning strategies.
- Train your own **custom AI trading models**.
- Bet on **pre-built AI agents** and let automation work for you.

---

## 🚀 Getting Started with Trade.fun

### 🛠 Quick Setup: TypeScript CLI Scripts

### **Step 1: Install Dependencies**
```sh
npm install @solana/web3.js @coral-xyz/anchor ts-node
```

### **Step 2: Initialize Admin**
```sh
ts-node scripts/initializeAdmin.ts
```
✅ Registers the **admin** to manage the vault.

### **Step 3: Initialize the Vault**
```sh
ts-node scripts/initializeVault.ts
```
✅ Sets up the **vault**, reward distribution, and platform fees.

### **Step 4: Start a Trading Round**
```sh
ts-node scripts/startRound.ts
```
✅ Opens the vault for deposits.

### **Step 5: Deposit SOL**
```sh
ts-node scripts/depositSol.ts
```
✅ Deposits **1 SOL** (modify for different amounts).

### **Step 6: End the Round & Collect Fees**
```sh
ts-node scripts/endRound.ts
```
✅ Closes deposits and collects platform fees.

### **Step 7: Distribute Rewards**
```sh
ts-node scripts/distributeSol.ts
```
✅ Pays out rewards based on customizable ratios.

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
✔️ **Only admin** can initialize the vault.
✔️ **Ensures reward ratios + fees = 100%**.

### **Depositing SOL**
```rust
pub fn deposit_sol(ctx: Context<DepositSol>) -> Result<()> { ... }
```
✔️ **Only possible when a round is active**.

### **Ending a Round & Collecting Fees**
```rust
pub fn end_round(ctx: Context<EndRound>) -> Result<()> { ... }
```
✔️ **Stops deposits & collects platform fees**.

### **Distributing Rewards**
```rust
pub fn distribute_sol(ctx: Context<DistributeSol>) -> Result<()> { ... }
```
✔️ **Rewards winners dynamically based on ratios**.
✔️ **Supports customizable distributions**.

---

## 🚀 Roadmap

### **Phase 1: Core Development**
- Basic trading competitions.
- On-chain leaderboard system.

### **Phase 2: DAO & Copy Trading Integration**
- Influencers create DAOs to tokenize their influence.
- DAOs require a reputation threshold to be created.
- DAOs grant access to privileged copy trading features.
- DAOs host exclusive trading competitions.
- DAO vs DAO trading battles.
- Automatic replication of top traders' positions.
- Traders earn fees from followers copying their moves.

### **Phase 3: AI Trading**
- Deploy AI trading agents.
- Train and customize AI trading strategies.
- Bet on pre-built AI agents for automated trading.

