import { ethers } from 'ethers';
import { TradeExecutor } from './tradeExecutor';
import { logger } from '../utils/logger';
import { TokenInfo, TradeResult } from '../types';

interface SellStrategy {
  type: 'profit-target' | 'time-based' | 'trailing-stop';
  profitPercentage?: number;  // For profit-target
  timeMs?: number;             // For time-based
  trailingPercentage?: number; // For trailing-stop
}

interface PendingSale {
  tokenInfo: TokenInfo;
  purchasePrice: string;
  amountBought: string;
  strategy: SellStrategy;
  scheduledAt: number;
  highestPrice?: string;
}

export class AutoSellManager {
  private tradeExecutor: TradeExecutor;
  private pendingSales: Map<string, PendingSale> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.tradeExecutor = new TradeExecutor();
  }

  /**
   * Schedule auto-sell for a token
   */
  public scheduleSell(
    tokenInfo: TokenInfo,
    purchasePrice: string,
    amountBought: string,
    strategy: SellStrategy
  ): void {
    const sale: PendingSale = {
      tokenInfo,
      purchasePrice,
      amountBought,
      strategy,
      scheduledAt: Date.now(),
      highestPrice: purchasePrice,
    };

    this.pendingSales.set(tokenInfo.address, sale);

    logger.info(`📅 Auto-sell scheduled for ${tokenInfo.symbol}`);
    logger.info(`   Strategy: ${strategy.type}`);
    logger.info(`   Amount: ${amountBought}`);

    if (!this.monitoringInterval) {
      this.startMonitoring();
    }
  }

  /**
   * Start monitoring for sell conditions
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      for (const [address, sale] of this.pendingSales.entries()) {
        try {
          await this.checkSellCondition(address, sale);
        } catch (error) {
          logger.error(`Error checking sell condition for ${address}:`, error);
        }
      }
    }, 5000); // Check every 5 seconds

    logger.info('🔄 Auto-sell monitoring started');
  }

  /**
   * Check if sell condition is met
   */
  private async checkSellCondition(
    address: string,
    sale: PendingSale
  ): Promise<void> {
    const { tokenInfo, strategy, purchasePrice, amountBought } = sale;

    // Get current price
    const currentPrice = await this.tradeExecutor.getTokenPrice(tokenInfo.address);
    const currentPriceNum = parseFloat(currentPrice);
    const purchasePriceNum = parseFloat(purchasePrice);

    if (currentPriceNum === 0) return;

    // Update highest price for trailing stop
    if (strategy.type === 'trailing-stop') {
      const highestPrice = parseFloat(sale.highestPrice || '0');
      if (currentPriceNum > highestPrice) {
        sale.highestPrice = currentPrice;
      }
    }

    let shouldSell = false;
    let reason = '';

    switch (strategy.type) {
      case 'profit-target':
        const profitPercentage = ((currentPriceNum - purchasePriceNum) / purchasePriceNum) * 100;
        if (profitPercentage >= (strategy.profitPercentage || 0)) {
          shouldSell = true;
          reason = `Profit target reached: ${profitPercentage.toFixed(2)}%`;
        }
        break;

      case 'time-based':
        const elapsedTime = Date.now() - sale.scheduledAt;
        if (elapsedTime >= (strategy.timeMs || 0)) {
          shouldSell = true;
          reason = `Time limit reached: ${(elapsedTime / 1000).toFixed(0)}s`;
        }
        break;

      case 'trailing-stop':
        const highestPrice = parseFloat(sale.highestPrice || purchasePrice);
        const dropPercentage = ((highestPrice - currentPriceNum) / highestPrice) * 100;
        if (dropPercentage >= (strategy.trailingPercentage || 0)) {
          shouldSell = true;
          reason = `Trailing stop triggered: ${dropPercentage.toFixed(2)}% drop from peak`;
        }
        break;
    }

    if (shouldSell) {
      logger.info(`🎯 Sell condition met for ${tokenInfo.symbol}: ${reason}`);
      await this.executeSell(address, sale);
    }
  }

  /**
   * Execute the sell transaction
   */
  private async executeSell(address: string, sale: PendingSale): Promise<void> {
    const { tokenInfo, amountBought } = sale;

    logger.info(`💸 Executing auto-sell for ${tokenInfo.symbol}`);

    const result = await this.tradeExecutor.sellToken(
      tokenInfo.address,
      amountBought,
      tokenInfo.decimals
    );

    if (result.success) {
      logger.info(`✅ Auto-sell successful!`);
      logger.info(`   TX: ${result.txHash}`);
      logger.info(`   Gas Used: ${result.gasUsed}`);
    } else {
      logger.error(`❌ Auto-sell failed: ${result.error}`);
    }

    // Remove from pending sales
    this.pendingSales.delete(address);

    // Stop monitoring if no more pending sales
    if (this.pendingSales.size === 0) {
      this.stopMonitoring();
    }
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('⏹️  Auto-sell monitoring stopped');
    }
  }

  /**
   * Cancel pending sell
   */
  public cancelSell(tokenAddress: string): boolean {
    const deleted = this.pendingSales.delete(tokenAddress);
    
    if (deleted) {
      logger.info(`🚫 Auto-sell cancelled for ${tokenAddress}`);
      
      if (this.pendingSales.size === 0) {
        this.stopMonitoring();
      }
    }

    return deleted;
  }

  /**
   * Get pending sales
   */
  public getPendingSales(): PendingSale[] {
    return Array.from(this.pendingSales.values());
  }

  /**
   * Stop all monitoring and clear pending sales
   */
  public shutdown(): void {
    this.stopMonitoring();
    this.pendingSales.clear();
    logger.info('🛑 Auto-sell manager shut down');
  }
}

export const autoSellManager = new AutoSellManager();

