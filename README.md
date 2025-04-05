# 🏆 Trade.fun

<div align="center">
  <img src="doc/diagram.jpeg" alt="Trade.fun Platform Diagram" width="100%">
  <h2>Trade 📈 Compete 🏆 Earn 💰</h2>
  <p><strong>The Ultimate On-Chain Trading Game on Solana</strong></p>
</div>

## 🚀 What is Trade.fun?

Trade.fun is an **influencer-driven trading game** built on **Solana Virtual Machine (SVM)**, designed to make trading competitions more **transparent, engaging, and rewarding**. Whether you're a seasoned trader or just starting out, **Trade.fun** offers an exciting way to showcase your skills, earn rewards, and build a trading community.

## 🌟 Current Features

### Core Trading System

- SOL to INF token swapping via Jupiter DEX
- Round-based trading competitions with on-chain verification
- Yield delivered in ZBTC tokens via LST in Sanctum
- No-risk participation: only yield is distributed, principal remains safe

### Platform Architecture

<div align="center">
  <img src="doc/diagram.jpeg" alt="Trade.fun Platform Architecture" width="70%">
</div>

### Key Components

| Component          | Function                                                     |
| ------------------ | ------------------------------------------------------------ |
| **Participants**   | Deposit SOL to join trading rounds and compete for rewards   |
| **Trading Rounds** | Time-bound competitions with real-time price tracking        |
| **Vault System**   | Securely stores principal and generates interest for rewards |
| **Winners**        | Receive ZBTC rewards based on performance metrics            |

### Technology Stack

- **Token System**: INF (participation), WSOL (deposits), ZBTC (rewards)
- **Price Oracle**: Pyth integration for fair market pricing
- **Smart Contracts**: Anchor framework on Solana
- **Reward Calculation**: Customizable distribution ratios

## 🔮 Future Roadmap

### Phase 1: Social Trading

- Copy trading from top performers (KOLs)
- Influencer-managed trading DAOs
- Tokenized trading influence

### Phase 2: Advanced Features

- AI trading agents and human vs AI competitions
- DAO vs DAO trading battles
- Custom strategy development platform

### Phase 3: Real-World Utility

- Banana Pay integration for fiat onboarding
- Direct reward distribution to payment cards
- Complete financial loop: fiat → yield → spending

## 🔧 Technical Implementation

### Principal and Interest Calculation

Trade.fun employs a sophisticated mechanism to protect principal while distributing only interest as rewards. This is how the system works:

#### How It Works:

1. **Deposit**: Users swap SOL for INF tokens via Jupiter DEX

   - `initial_inf_price = total_inf_received / total_sol_deposited`

2. **Principal Protection**: Principal value is calculated and preserved

   - `principal_inf = total_inf * 100 / (100 + price_increase)`

3. **Yield Calculation**: Interest is determined from INF price appreciation

   - `price_increase = (current_inf_sol_price - initial_inf_price) * 100 / initial_inf_price`
   - `interest_inf = total_inf - principal_inf`

4. **Reward Distribution**: Winners receive ZBTC converted from yield
   - `reward_amount = interest_inf * round_participation_tokens / reward_token_supply`

This system ensures that:

- Principal remains safe and can be redeemed by depositors
- Only yield generated during the competition is distributed as rewards
- Participants can compete without risking their deposited capital

## 🛠 Getting Started

### Prerequisites

- Node.js (v23+) and pnpm installed
- Solana CLI tools (v1.14+)
- A Solana wallet with SOL for deployment and testing

### Installation

```sh
# Clone the repository
git clone https://github.com/yourusername/trade-fun.git
cd trade-fun

# Install dependencies
pnpm install

# Build the program
anchor build
```

### Environment Setup

1. Copy the example environment file:

   ```sh
   cp .env.example .env
   ```

2. Update the `.env` file with your own wallet keypair path and Solana cluster:

   ```
   RPC_URL=https://api.mainnet-beta.solana.com
   KEYPAIR=your_string_private_key
   ```

### Quick Setup: TypeScript CLI Scripts

<table>
<tr>
<td>

#### Initial Setup

```sh
# Install dependencies
npm install @solana/web3.js @coral-xyz/anchor ts-node

# Initialize admin
ts-node scripts/initializeAdmin.ts

# Initialize the vault
ts-node scripts/initializeVault.ts
```

</td>
<td>

#### Running a Competition

```sh
# Start a trading round
ts-node scripts/startRound.ts

# Deposit SOL and participate
ts-node scripts/depositSol.ts

# End round and distribute rewards
ts-node scripts/endRound.ts
ts-node scripts/distributeSol.ts
```

</td>
</tr>
</table>

### Testing

```sh
# Run the test suite
anchor test

# Run specific tests
anchor test -- -t "should initialize vault"
```

### Deployment

For local development:

```sh
# Start a local validator
solana-test-validator

# Deploy to localnet
anchor deploy
```

For testnet/mainnet:

```sh
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta
```

### Troubleshooting

- **Insufficient funds error**: Ensure your wallet has enough SOL for transaction fees
- **Account already exists**: You may need to use a new wallet or reset your local validator
- **Invalid program id**: Make sure the program ID in `Anchor.toml` matches the one in `declare_id!()`

For more detailed instructions and API documentation, check the [developer docs](https://docs.trade.fun).

---

<div align="center">
  <h3>Ready to join the future of trading competitions?</h3>
  <a href="https://trade.fun">Visit Trade.fun</a> | 
  <a href="https://twitter.com/tradefun">Twitter</a> | 
  <a href="https://discord.gg/tradefun">Discord</a>
</div>
