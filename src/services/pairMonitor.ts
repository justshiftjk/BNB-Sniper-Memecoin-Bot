import { ethers } from 'ethers';
import { web3Provider } from '../utils/web3Provider';
import { logger } from '../utils/logger';
import { config } from '../config';
import { FACTORY_ABI, PAIR_ABI } from '../contracts/abis';

export interface NewPairEvent {
  pair: string;
  token0: string;
  token1: string;
  blockNumber: number;
  txHash: string;
}

export class PairMonitor {
  private factory: ethers.Contract | null = null;
  private isMonitoring = false;

  constructor() {
    if (config.pancakeFactoryAddress) {
      this.factory = new ethers.Contract(
        config.pancakeFactoryAddress,
        FACTORY_ABI,
        web3Provider.wsProvider || web3Provider.httpProvider
      );
    }
  }

  public async startMonitoring(callback: (event: NewPairEvent) => void): Promise<void> {
    if (!this.factory) {
      logger.warn('PancakeSwap factory not configured, skipping pair monitoring');
      return;
    }

    if (this.isMonitoring) {
      logger.warn('Pair monitor already active');
      return;
    }

    this.isMonitoring = true;
    logger.info('🔎 Starting PancakeSwap PairCreated monitoring...');

    this.factory.on('PairCreated', async (token0: string, token1: string, pair: string, eventIndex: any, event: any) => {
      try {
        const pairContract = new ethers.Contract(pair, PAIR_ABI, web3Provider.httpProvider);
        const [resolvedToken0, resolvedToken1] = await Promise.all([
          pairContract.token0(),
          pairContract.token1(),
        ]);

        logger.info(`🧩 New pair: ${pair} [${resolvedToken0} / ${resolvedToken1}]`);

        callback({
          pair,
          token0: resolvedToken0,
          token1: resolvedToken1,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
        });
      } catch (error) {
        logger.error('Error processing PairCreated:', error);
      }
    });

    logger.info('✅ Pair monitoring active');
  }

  public stopMonitoring(): void {
    if (this.factory) {
      this.factory.removeAllListeners('PairCreated');
    }
    this.isMonitoring = false;
    logger.info('⏹️  Pair monitoring stopped');
  }
}

export const pairMonitor = new PairMonitor();
