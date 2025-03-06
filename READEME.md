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

### **Initialize Admin**
```sh
anchor test --filter "Admin initializes"
```

### **Initialize Vault**
```sh
anchor test --filter "Vault Initialized"
```

### **Start a New Round**
```sh
anchor test --filter "Starts the league round"
```

### **Deposit SOL**
```sh
anchor test --filter "User deposits 0.1 SOL"
```

### **End the Round & Collect Fees**
```sh
anchor test --filter "Ends the league round"
```

### **Distribute Rewards**
```sh
anchor test --filter "Distributes remaining SOL"
```

### **Update Vault Settings (Admin Only)**
```sh
anchor test --filter "Admin updates vault settings"
```

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

### **Depositing SOL**
```rust
pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> { ... }
```
✔️ **Only allowed if round is active**.  

### **Updating Vault Settings**
```rust
pub fn update_vault_settings(
    ctx: Context<UpdateVaultSettings>,
    new_reward_ratios: Vec<u64>,
    new_platform_fee: u64,
) -> Result<()> { ... }
```
✔️ **Admin can update reward ratios & platform fee dynamically**.  
