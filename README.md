# Trade.fun - On-Chain Trading Competition Platform

![Trade.fun Architecture](doc/diagram.jpeg)

Trade.fun is a Solana-based trading competition platform that enables users to compete for ZBTC rewards without risking their principal investment.

## Platform Overview

Trade.fun offers a secure trading environment where participants:

1. Deposit SOL to join trading rounds
2. Compete using INF tokens (principal stays secure)
3. Win ZBTC rewards based on trading performance
4. Redeem the principle on round end

## Core Technical Architecture

- Built native Solana program using Rust and Anchor framework
- Implemented on-chain state management with secure account structures
- Utilized SPL tokens for handling zBTC and SOL interactions

## Smart Contract Implementation

- Developed instructions for SOL deposits and reward distribution
- Created PDAs for secure vault management
- Used Solana's atomic transaction model for safe SOL-to-INF conversions

## Vault Mechanism

The platform uses a sophisticated vault system with two components:

- **Principal INF**: Users' initial deposits, always protected
- **Interest INF**: Yield generated from deposits, distributed as rewards

When users deposit SOL:

1. SOL is converted to INF tokens via Jupiter DEX
2. The initial exchange rate is recorded in PDAs
3. Principal amount is locked in the vault
4. Only generated interest is distributed to winners

## Exchange Rate Tracking & Yield Calculation

- PDAs store initial exchange rate at deposit time
- Smart contract calculates real-time rate changes using Pyth
- If INF/SOL rate increases by 10%, principle becomes 90% of total INF
- Yield is the difference between current and principal INF amounts

## Platform Flow (as shown in diagram)

1. **Participants** deposit SOL through the platform
2. SOL is converted to INF tokens and stored in the **Vault**
3. Participants join **Rounds** using CHIP tokens
4. Winners receive rewards from the interest generated
5. Users can redeem their principal at any time

## Reward Token Implementation

- Deployed "CHIP" token for platform participation
- Users receive CHIP tokens proportional to SOL deposits
- CHIP tokens enable participation in special rounds

## Technical Integrations

### Jupiter Integration

- Used Jupiter's aggregator for optimal token swaps
- Integrated CPI for SOL-to-INF conversions

### Pyth Oracle Integration

- Used for real-time INF/SOL and USD price data
- Implemented safety mechanisms to verify price feed accuracy

### Token Management

- Secure token transfers via SPL token program
- Token vaults controlled by program PDAs
- Trustless minting/burning operations for CHIP tokens

## Current Features

Our yield-based trading model lets users earn ZBTC rewards via LST in Sanctum without risking their principal investment. The platform provides:

- Real-time trading competitions
- Secure vault management
- On-chain verification of all transactions
- Transparent reward distribution

## Future Roadmap

We're expanding the platform with exciting new features:

1. **DAO vs DAO Competitions**: Creating new social dynamics in trading
2. **Copy Trading**: Connecting influencers with followers
3. **AI vs Human Battles**: Pushing strategic boundaries in trading
4. **Streamlined UX via Banana Pay**: Making sophisticated trading accessible to everyone

All while maintaining full on-chain transparency and security.

## CLI Usage Guide

The Trade.fun platform provides a set of CLI scripts to interact with the deployed smart contract. These scripts allow you to manage the entire lifecycle of trading rounds and user interactions.

### Prerequisites

1. Create a `.env` file with your configuration:

```
RPC_URL=https://api.mainnet-beta.solana.com
KEYPAIR=your_base58_encoded_private_key
```

2. Install dependencies:

```bash
npm install
```

### Available Commands

Each script is designed to interact with a specific contract functionality:

#### 1. Deposit SOL

Deposits SOL into the platform, converting it to INF tokens and storing them in the vault.

```bash
npx ts-node cli/deposit.ts <amount_in_sol> <round_number>
```

#### 2. Initialize a New Trading Round

Creates a new trading round with specified parameters.

```bash
npx ts-node cli/initializeRound.ts <round_number> <start_timestamp> <end_timestamp>
```

#### 3. Start a Trading Round

Activates a previously initialized round.

```bash
npx ts-node cli/startRound.ts <round_number>
```

#### 4. Participate in a Round

Allows a user to join an active trading round.

```bash
npx ts-node cli/participateRound.ts <round_number>
```

#### 5. Close a Trading Round

Finalizes a round after its end time has passed.

```bash
npx ts-node cli/closeRound.ts <round_number>
```

#### 6. Distribute Rewards

Distributes earned interest to round winners.

```bash
npx ts-node cli/distributeReward.ts <round_number>
```

#### 7. Distribute ZBTC Rewards

Distributes ZBTC rewards to round winners.

```bash
npx ts-node cli/distributeZbtcReward.ts <round_number>
```

#### 8. Redeem Principal

Allows users to withdraw their principal from the vault.

```bash
npx ts-node cli/redeem.ts
```

### Monitoring Tools

The platform also includes tools to check the status of rounds and reward balances:

```bash
# Check status of all rounds
npx ts-node cli/check_rounds.ts

# Check reward balance
npx ts-node cli/check_reward_balance.ts
```

### Example Workflow

A typical workflow for managing a trading round:

1. Initialize a new round
2. Users deposit SOL to join
3. Start the round at the scheduled time
4. Users participate in trading
5. Close the round after end time
6. Distribute rewards to winners
7. Users can redeem their principal
