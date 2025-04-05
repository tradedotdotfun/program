# 🏆 Trade.fun

<div align="center">
  <h2>Trade 📈 Compete 🏆 Earn 💰</h2>
  <p><strong>The Ultimate On-Chain Trading Game on Solana</strong></p>
</div>

## 🚀 What is Trade.fun?

Trade.fun is an **influencer-driven trading game** built on **Solana Virtual Machine (SVM)**, designed to make trading competitions more **transparent, engaging, and rewarding**. Whether you're a seasoned trader or just starting out, **Trade.fun** offers an exciting way to showcase your skills, earn rewards, and build a trading community.

## 🌐 Platform Architecture

```
┌─────────────────┐       ┌─────────────────────────┐       ┌─────────────────┐
│                 │       │                         │       │                 │
│  Participants   │◄──────┤   Trading Rounds        │◄──────┤    Winners      │
│                 │       │                         │       │                 │
└────────┬────────┘       └─────────────────────────┘       └────────▲────────┘
         │                                                           │
         │                                                           │
         │                                                           │
         │                  ┌─────────────────────────┐              │
         │                  │         Vault           │              │
         │                  ├─────────────────────────┤              │
         └─────────────────►│     Interest INF        ├──────────────┘
                            ├─────────────────────────┤
                            │    Principal INF        │
                            └─────────────────────────┘
```

### 🔥 Why Choose Trade.fun?

- **Showcase & Monetize** → Influencers can prove their trading expertise and earn from it
- **On-Chain Transparency** → All performance data is verifiable, ensuring fairness and accountability
- **Community-Driven** → Build DAOs, launch influence tokens, and compete at the highest level

---

## 🌐 Core Platform Components

### 👥 Participants

Traders who enter the platform and:

- Deposit SOL to join trading rounds via `deposit_sol` instruction
- Compete to earn rewards based on trading performance
- Build reputation through consistent winning performance
- Can participate in multiple rounds simultaneously

### 🏦 Secure Vault System

The core financial infrastructure that:

- **Principal INF** - Safely stores deposited funds from participants
- **Interest INF** - Accumulates yield for reward distribution
- Provides complete on-chain transparency of all deposits and rewards
- Enforces programmable distribution schedules for fair competition

### ⏱️ Trading Rounds

The competitive environment where:

- Time-bound competitions with real-time price tracking
- Fully on-chain trading mechanics for verifiable performance
- Interactive trading interface with live price charts
- Participants can enter through `participate_round` instruction

### 🏆 Winners & Rewards

Successful traders who:

- Receive rewards based on customizable distribution ratios
- Get automatic reward distribution via `distribute_reward` instruction
- Have all performance metrics stored on-chain for transparency
- Can leverage their success to build trading influence

---

## 🔑 Innovative Features

### 📈 Trading Competitions

- Users deposit **SOL** to enter active rounds
- All trades are **recorded on-chain** for full transparency
- Rewards are **distributed based on trading performance**
- **Top performers** can form DAOs and **tokenize their influence**

### 🏛 DAO Integration

- **Earn a reputation?** Create a **trading DAO**
- **Launch tradable influence tokens**, allowing others to invest in your success
- **Access private insights & privileged copy trading** by joining influencer DAOs
- **Engage in DAO vs. DAO trading battles**, leveraging collective strategies

### 😇 Angel Mode – No-Risk Betting

- Bet using **yield** from **LST SOL** instead of risking your principal
- Participate in competitions with **future expected yield**
- **Yield unlocks gradually**, keeping your original SOL safe
- Withdraw your **original SOL** after a set lock period

### 🤖 AI-Powered Trading

- Deploy **AI trading agents** trained to execute winning strategies
- Train your own **custom AI trading models**
- Bet on **pre-built AI agents** and let automation work for you

---

## 🚀 Getting Started with Trade.fun

### 🛠 Quick Setup: TypeScript CLI Scripts

<table>
<tr>
<td>

#### Step 1: Install Dependencies

```sh
npm install @solana/web3.js @coral-xyz/anchor ts-node
```

#### Step 2: Initialize Admin

```sh
ts-node scripts/initializeAdmin.ts
```

✅ Registers the **admin** to manage the vault

#### Step 3: Initialize the Vault

```sh
ts-node scripts/initializeVault.ts
```

✅ Sets up the **vault**, reward distribution, and platform fees

#### Step 4: Start a Trading Round

```sh
ts-node scripts/startRound.ts
```

✅ Opens the vault for deposits

</td>
<td>

#### Step 5: Deposit SOL

```sh
ts-node scripts/depositSol.ts
```

✅ Deposits **1 SOL** (modify for different amounts)

#### Step 6: End the Round & Collect Fees

```sh
ts-node scripts/endRound.ts
```

✅ Closes deposits and collects platform fees

#### Step 7: Distribute Rewards

```sh
ts-node scripts/distributeSol.ts
```

✅ Pays out rewards based on customizable ratios

</td>
</tr>
</table>

---

## 🏗️ Program Structure

### Core Instructions

<table>
<tr>
<td>

#### Vault Initialization

```rust
pub fn initialize_vault(
    ctx: Context<InitializeVault>,
    reward_ratios: Vec<u64>,
    platform_fee: u64,
) -> Result<()> { ... }
```

✔️ **Only admin** can initialize the vault<br>
✔️ **Ensures reward ratios + fees = 100%**

#### Depositing SOL

```rust
pub fn deposit_sol(
    ctx: Context<DepositSol>
) -> Result<()> { ... }
```

✔️ **Only possible when a round is active**

</td>
<td>

#### Ending a Round & Collecting Fees

```rust
pub fn end_round(
    ctx: Context<EndRound>
) -> Result<()> { ... }
```

✔️ **Stops deposits & collects platform fees**

#### Distributing Rewards

```rust
pub fn distribute_sol(
    ctx: Context<DistributeSol>
) -> Result<()> { ... }
```

✔️ **Rewards winners dynamically based on ratios**<br>
✔️ **Supports customizable distributions**

</td>
</tr>
</table>

### Flow Diagram

```
┌─────────────────┐                           ┌─────────────────┐
│  Participant    │                           │  Winners        │
└────────┬────────┘                           └────────▲────────┘
         │                                             │
         │ deposit_sol                                 │ distribute_reward
         ▼                                             │
┌─────────────────┐    participate_round    ┌─────────────────┐
│      Vault      │◄───────────────────────►│     Round       │
└─────────────────┘                         └─────────────────┘
```

---

## 🚀 Roadmap

<table>
<tr>
<td>

### Phase 1: Core Development

- Basic trading competitions
- On-chain leaderboard system
- Initial vault and reward system

</td>
<td>

### Phase 2: DAO & Copy Trading

- Influencer DAOs with tokenized influence
- Privileged copy trading features
- DAO vs DAO trading battles

</td>
<td>

### Phase 3: AI Trading

- AI trading agents deployment
- Custom AI trading strategies
- Automated trading systems

</td>
</tr>
</table>

---

<div align="center">
  <h3>Ready to join the future of trading competitions?</h3>
  <a href="https://trade.fun">Visit Trade.fun</a> | 
  <a href="https://twitter.com/tradefun">Twitter</a> | 
  <a href="https://discord.gg/tradefun">Discord</a>
</div>
