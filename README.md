# 🎯 BNB Sniper Bot - Four.meme Edition

Advanced BNB Chain sniper bot for detecting and buying tokens instantly on four.meme platform with MEV support.

## 🚀 Features

- **Real-time Token Detection**: Monitors four.meme factory for new token creations
- **Mempool Monitoring**: Detects tokens in mempool before they're mined (0-block sniping)
- **MEV Support**: 
  - Front-running capabilities
  - Back-running strategies
  - Precision timing execution
- **Auto-Buy**: Instantly purchases tokens upon detection
- **Retry Mechanism**: 3-attempt retry system with exponential backoff
- **Gas Optimization**: Dynamic gas pricing with configurable limits
- **Slippage Protection**: Configurable slippage tolerance
- **Comprehensive Logging**: Winston-based logging with file rotation

## 📋 Prerequisites

- Node.js v16+ and npm
- BNB Chain RPC endpoint (Recommended: QuickNode, Ankr, or BSC official)
- WebSocket endpoint for mempool monitoring
- Wallet with BNB for trading and gas fees

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd Solana-Sniper-Memecoin-Bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
# Blockchain Configuration
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_WSS_URL=wss://bsc-dataseed.binance.org/
CHAIN_ID=56

# Wallet Configuration
PRIVATE_KEY=0xYourPrivateKeyHere
WALLET_ADDRESS=0xYourWalletAddress

# Trading Configuration
BUY_AMOUNT=0.1
SLIPPAGE_BPS=100
GAS_LIMIT=500000
MAX_GAS_PRICE=10

# Four.meme Configuration
FOUR_MEME_FACTORY_ADDRESS=0x...
FOUR_MEME_ROUTER_ADDRESS=0x...

# MEV Configuration
ENABLE_FRONTRUN=true
ENABLE_BACKRUN=true
```

4. **Build the project**
```bash
npm run build
```

## 🎮 Usage

### Start the Bot

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

### Expected Output

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           🎯 BNB SNIPER BOT - FOUR.MEME 🎯              ║
║                                                           ║
║         High-Speed Token Sniper with MEV Support          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

2024-01-01 12:00:00 [info]: Validating configuration...
2024-01-01 12:00:00 [info]: ✅ Configuration valid
2024-01-01 12:00:00 [info]: 🚀 Starting BNB Sniper Bot...
2024-01-01 12:00:00 [info]: ⚙️  Configuration:
2024-01-01 12:00:00 [info]:    Chain ID: 56
2024-01-01 12:00:00 [info]:    Wallet: 0x...
2024-01-01 12:00:00 [info]:    Balance: 1.5 BNB
2024-01-01 12:00:00 [info]:    Buy Amount: 0.1 BNB
2024-01-01 12:00:00 [info]:    Slippage: 1%
2024-01-01 12:00:00 [info]:    Frontrun: ENABLED
```

## 📁 Project Structure

```
├── src/
│   ├── bot/
│   │   └── sniperBot.ts        # Main bot logic
│   ├── config/
│   │   └── index.ts            # Configuration management
│   ├── contracts/
│   │   └── abis.ts             # Smart contract ABIs
│   ├── services/
│   │   ├── tokenMonitor.ts     # Token creation monitoring
│   │   ├── mevExecutor.ts      # MEV execution strategies
│   │   └── tradeExecutor.ts    # Trade execution logic
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── utils/
│   │   ├── logger.ts           # Logging utility
│   │   └── web3Provider.ts     # Web3 connection management
│   └── index.ts                # Entry point
├── logs/                       # Log files
├── .env                        # Environment configuration
├── package.json
└── tsconfig.json
```

## ⚙️ Configuration

### Trading Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `BUY_AMOUNT` | BNB amount to spend per trade | 0.1 |
| `SLIPPAGE_BPS` | Slippage tolerance in basis points (100 = 1%) | 100 |
| `GAS_LIMIT` | Maximum gas limit per transaction | 500000 |
| `GAS_PRICE_MULTIPLIER` | Gas price multiplier for faster inclusion | 1.2 |
| `MAX_GAS_PRICE` | Maximum gas price in GWEI | 10 |

### MEV Configuration

- **ENABLE_FRONTRUN**: Execute transactions before target transaction
- **ENABLE_BACKRUN**: Execute transactions immediately after target
- **MEV_SHARE_PERCENTAGE**: Percentage of MEV profit to keep (80 = 80%)

## 🔐 Security

- **Private Key Security**: Never commit `.env` file or expose private keys
- **Gas Limits**: Bot has configurable gas limits to prevent runaway costs
- **Balance Validation**: Checks wallet balance before each trade
- **Slippage Protection**: Configurable slippage to prevent sandwich attacks
- **Error Handling**: Comprehensive error handling and logging

## ⚠️ Risks & Disclaimers

**WARNING: This bot is for educational purposes. Use at your own risk.**

- **Financial Risk**: You can lose all invested funds
- **Smart Contract Risk**: New tokens may be malicious or honeypots
- **MEV Risk**: Front-running/back-running can fail and waste gas
- **Gas Costs**: Failed transactions still consume gas fees
- **Market Risk**: Extreme volatility in memecoin markets

**Always:**
- Test on BSC testnet first
- Start with small amounts
- Monitor bot activity
- Understand the code before running



## 📊 Performance Tips

1. **Use Premium RPC**: QuickNode or Ankr for faster response times
2. **Enable Mempool**: WSS endpoint enables 0-block detection
3. **Optimize Gas**: Balance between speed and cost
4. **MEV Strategy**: Test frontrun vs backrun for your use case
5. **Multiple Wallets**: Distribute across wallets to avoid nonce conflicts

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create feature branch
3. Test thoroughly on testnet
4. Submit pull request


## 📩 Contact  
For inquiries, custom integrations, or tailored solutions, reach out via:  

💬 **Telegram**: [@bettyjk_0915](https://t.me/bettyjk_0915)

---

