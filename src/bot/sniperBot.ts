import { TokenMonitor } from '../services/tokenMonitor';
import { pairMonitor, NewPairEvent } from '../services/pairMonitor';
import { TradeExecutor } from '../services/tradeExecutor';
import { web3Provider } from '../utils/web3Provider';
import { logger } from '../utils/logger';
import { config } from '../config';
import { TokenInfo, TradeResult } from '../types';

export class SniperBot {
  private tokenMonitor: TokenMonitor;
  private tradeExecutor: TradeExecutor;
  private isRunning = false;
  private tradedTokens: Set<string> = new Set();
  private successfulTrades = 0;
  private failedTrades = 0;

  constructor() {
    this.tokenMonitor = new TokenMonitor();
    this.tradeExecutor = new TradeExecutor();
  }

  /**
   * Start the sniper bot
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot is already running');
      return;
    }

    logger.info('🚀 Starting BNB Sniper Bot...');
    logger.info('════════════════════════════════════════════════════════════');

    try {
      // Display configuration
      await this.displayConfig();

      // Validate setup
      await this.validateSetup();

      // Start monitoring
      this.isRunning = true;
      await this.tokenMonitor.startMonitoring(this.handleNewToken.bind(this));
      // Also monitor PancakeSwap pair creations to quickly obtain token addresses
      await pairMonitor.startMonitoring(this.handleNewPair.bind(this));

      logger.info('════════════════════════════════════════════════════════════');
      logger.info('✅ Bot is now running and monitoring for new tokens...');
      logger.info('   Press Ctrl+C to stop');
      logger.info('════════════════════════════════════════════════════════════');
    } catch (error) {
      logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  /**
   * Handle newly detected token
   */
  private async handleNewToken(tokenInfo: TokenInfo): Promise<void> {
    try {
      // Prevent duplicate trades
      if (this.tradedTokens.has(tokenInfo.address)) {
        logger.debug(`Token ${tokenInfo.address} already processed, skipping`);
        return;
      }

      logger.info('════════════════════════════════════════════════════════════');
      logger.info(`🎯 NEW TOKEN DETECTED!`);
      logger.info(`   Name: ${tokenInfo.name}`);
      logger.info(`   Symbol: ${tokenInfo.symbol}`);
      logger.info(`   Address: ${tokenInfo.address}`);
      logger.info(`   Creator: ${tokenInfo.creator}`);
      logger.info(`   Block: ${tokenInfo.blockNumber || 'PENDING'}`);
      logger.info('════════════════════════════════════════════════════════════');

      // Mark as processed
      this.tradedTokens.add(tokenInfo.address);

      // Execute buy
      const result = await this.tradeExecutor.buyToken(tokenInfo);

      if (result.success) {
        this.successfulTrades++;
        logger.info('════════════════════════════════════════════════════════════');
        logger.info('🎉 TRADE SUCCESSFUL!');
        logger.info(`   Transaction: ${result.txHash}`);
        logger.info(`   Tokens Bought: ${result.tokensBought} ${tokenInfo.symbol}`);
        logger.info(`   Gas Used: ${result.gasUsed}`);
        logger.info('════════════════════════════════════════════════════════════');

        // Optional: Auto-sell logic could be implemented here
        // await this.scheduleAutoSell(tokenInfo, result);
      } else {
        this.failedTrades++;
        logger.error('════════════════════════════════════════════════════════════');
        logger.error('❌ TRADE FAILED!');
        logger.error(`   Reason: ${result.error}`);
        logger.error('════════════════════════════════════════════════════════════');
      }

      // Display stats
      this.displayStats();
    } catch (error) {
      logger.error('Error handling new token:', error);
      this.failedTrades++;
    }
  }

  /**
   * Handle new PancakeSwap pair creation
   */
  private async handleNewPair(event: NewPairEvent): Promise<void> {
    // If the new pair involves WBNB, we can treat the other token as target
    const { token0, token1 } = event;
    const wbnb = config.wbnbAddress.toLowerCase();

    let targetToken = '';
    if (token0.toLowerCase() === wbnb) targetToken = token1;
    if (token1.toLowerCase() === wbnb) targetToken = token0;

    if (!targetToken) return;

    // Don't re-trade the same token
    if (this.tradedTokens.has(targetToken)) return;

    // Minimal token info when discovered via pair
    const tokenInfo: TokenInfo = {
      address: targetToken,
      name: 'Unknown',
      symbol: 'UNKNOWN',
      decimals: 18,
      creator: '0x0000000000000000000000000000000000000000',
      blockNumber: event.blockNumber,
      timestamp: Math.floor(Date.now() / 1000),
      txHash: event.txHash,
    };

    // Try to enrich name/symbol
    try {
      const { ethers } = await import('ethers');
      const { ERC20_ABI } = await import('../contracts/abis');
      const tokenContract = new (ethers as any).Contract(targetToken, ERC20_ABI, web3Provider.httpProvider);
      tokenInfo.name = await tokenContract.name();
      tokenInfo.symbol = await tokenContract.symbol();
      tokenInfo.decimals = await tokenContract.decimals();
    } catch {}

    // Delegate to the same handler
    await this.handleNewToken(tokenInfo);
  }

  /**
   * Display current configuration
   */
  private async displayConfig(): Promise<void> {
    const balance = await web3Provider.getBalance();
    const currentBlock = await web3Provider.getCurrentBlock();

    logger.info('⚙️  Configuration:');
    logger.info(`   Chain ID: ${config.chainId}`);
    logger.info(`   Wallet: ${config.walletAddress}`);
    logger.info(`   Balance: ${balance} BNB`);
    logger.info(`   Current Block: ${currentBlock}`);
    logger.info(`   Buy Amount: ${config.buyAmount} BNB`);
    logger.info(`   Slippage: ${config.slippageBps / 100}%`);
    logger.info(`   Gas Limit: ${config.gasLimit}`);
    logger.info(`   Max Gas Price: ${config.maxGasPrice} GWEI`);
    logger.info(`   Frontrun: ${config.enableFrontrun ? 'ENABLED' : 'DISABLED'}`);
    logger.info(`   Backrun: ${config.enableBackrun ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Validate bot setup
   */
  private async validateSetup(): Promise<void> {
    logger.info('🔍 Validating setup...');

    // Check balance
    const balance = await web3Provider.wallet.getBalance();
    const minBalance = ethers.utils.parseEther(config.buyAmount);

    if (balance.lt(minBalance)) {
      throw new Error(
        `Insufficient balance. Have: ${ethers.utils.formatEther(balance)} BNB, ` +
        `Need at least: ${config.buyAmount} BNB`
      );
    }

    // Check RPC connection
    const blockNumber = await web3Provider.getCurrentBlock();
    if (!blockNumber || blockNumber === 0) {
      throw new Error('Cannot connect to blockchain RPC');
    }

    // Check factory address
    if (!config.fourMemeFactoryAddress) {
      throw new Error('FOUR_MEME_FACTORY_ADDRESS not configured in .env');
    }

    logger.info('✅ Setup validation passed');
  }

  /**
   * Display trading statistics
   */
  private displayStats(): void {
    const total = this.successfulTrades + this.failedTrades;
    const successRate = total > 0 ? ((this.successfulTrades / total) * 100).toFixed(2) : '0.00';

    logger.info('');
    logger.info('📊 Trading Statistics:');
    logger.info(`   Total Attempts: ${total}`);
    logger.info(`   Successful: ${this.successfulTrades}`);
    logger.info(`   Failed: ${this.failedTrades}`);
    logger.info(`   Success Rate: ${successRate}%`);
    logger.info('');
  }

  /**
   * Stop the bot
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Bot is not running');
      return;
    }

    logger.info('⏹️  Stopping bot...');
    
    this.tokenMonitor.stopMonitoring();
    web3Provider.destroy();
    
    this.isRunning = false;
    
    this.displayStats();
    logger.info('✅ Bot stopped successfully');
  }

  /**
   * Check if bot is running
   */
  public getStatus(): boolean {
    return this.isRunning;
  }
}

// Missing import
import { ethers } from 'ethers';

