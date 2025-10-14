import { ethers } from 'ethers';
import { web3Provider } from '../utils/web3Provider';
import { logger } from '../utils/logger';
import { config } from '../config';
import { TokenInfo } from '../types';
import { FOUR_MEME_FACTORY_ABI, ERC20_ABI } from '../contracts/abis';

export class TokenMonitor {
  private factoryContract: ethers.Contract | null = null;
  private isMonitoring = false;

  constructor() {
    if (config.fourMemeFactoryAddress) {
      this.factoryContract = new ethers.Contract(
        config.fourMemeFactoryAddress,
        FOUR_MEME_FACTORY_ABI,
        web3Provider.wsProvider || web3Provider.httpProvider
      );
    }
  }

  public async startMonitoring(callback: (tokenInfo: TokenInfo) => void): Promise<void> {
    if (!this.factoryContract) {
      throw new Error('Factory contract not initialized. Check FOUR_MEME_FACTORY_ADDRESS in .env');
    }

    if (this.isMonitoring) {
      logger.warn('Token monitoring is already active');
      return;
    }

    this.isMonitoring = true;
    logger.info('🔍 Starting token creation monitoring on four.meme...');

    // Monitor pending transactions in mempool for faster detection
    this.monitorMempool(callback);

    // Also listen to confirmed events as backup
    this.factoryContract.on('TokenCreated', async (token, creator, name, symbol, timestamp, event) => {
      try {
        logger.info(`🆕 New token detected: ${name} (${symbol}) at ${token}`);

        const tokenInfo: TokenInfo = {
          address: token,
          name,
          symbol,
          decimals: 18, // Default, will be fetched
          creator,
          blockNumber: event.blockNumber,
          timestamp: timestamp.toNumber(),
          txHash: event.transactionHash,
        };

        // Fetch token decimals
        try {
          const tokenContract = new ethers.Contract(token, ERC20_ABI, web3Provider.httpProvider);
          tokenInfo.decimals = await tokenContract.decimals();
        } catch (error) {
          logger.warn('Could not fetch token decimals, using default 18');
        }

        if (token && token !== ethers.constants.AddressZero) {
          callback(tokenInfo);
        }
      } catch (error) {
        logger.error('Error processing TokenCreated event:', error);
      }
    });

    logger.info('✅ Token monitoring active');
  }

  private monitorMempool(callback: (tokenInfo: TokenInfo) => void): void {
    if (!web3Provider.wsProvider) {
      logger.warn('WebSocket provider not available for mempool monitoring');
      return;
    }

    web3Provider.wsProvider.on('pending', async (txHash: string) => {
      try {
        const tx = await web3Provider.httpProvider.getTransaction(txHash);
        
        if (!tx || !tx.to || tx.to.toLowerCase() !== config.fourMemeFactoryAddress.toLowerCase()) {
          return;
        }

        // Decode transaction data to detect token creation
        const iface = new ethers.utils.Interface(FOUR_MEME_FACTORY_ABI);
        
        try {
          const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });
          
          if (decoded.name === 'createToken') {
            logger.info(`🚀 MEMPOOL: Token creation detected! TX: ${txHash}`);
            
            // We detected it in mempool, now we need to act FAST
            const tokenInfo: TokenInfo = {
              address: '', // unknown until mined; do not trade yet
              name: decoded.args.name,
              symbol: decoded.args.symbol,
              decimals: 18,
              creator: tx.from,
              blockNumber: 0, // Pending
              timestamp: Math.floor(Date.now() / 1000),
              txHash,
            };
            // Do not invoke trade callback without a token address
            // We will rely on the confirmed TokenCreated event above
          }
        } catch (decodeError) {
          // Not a createToken transaction, ignore
        }
      } catch (error) {
        // Ignore errors for invalid transactions
      }
    });

    logger.info('👀 Mempool monitoring active for instant detection');
  }

  public stopMonitoring(): void {
    if (this.factoryContract) {
      this.factoryContract.removeAllListeners();
    }
    
    if (web3Provider.wsProvider) {
      web3Provider.wsProvider.removeAllListeners('pending');
    }

    this.isMonitoring = false;
    logger.info('⏹️  Token monitoring stopped');
  }

  public isActive(): boolean {
    return this.isMonitoring;
  }
}

