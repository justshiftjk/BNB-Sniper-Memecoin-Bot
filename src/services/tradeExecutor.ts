import { ethers } from 'ethers';
import { web3Provider } from '../utils/web3Provider';
import { logger } from '../utils/logger';
import { config } from '../config';
import { TradeResult, TokenInfo } from '../types';
import { PANCAKE_ROUTER_ABI, ERC20_ABI } from '../contracts/abis';
import { mevExecutor } from './mevExecutor';

export class TradeExecutor {
  private routerContract: ethers.Contract;
  private maxRetries = 3;

  constructor() {
    this.routerContract = new ethers.Contract(
      config.pancakeRouterAddress,
      PANCAKE_ROUTER_ABI,
      web3Provider.wallet
    );
  }

  /**
   * Execute token buy with retry mechanism
   */
  public async buyToken(tokenInfo: TokenInfo): Promise<TradeResult> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`💰 Attempting to buy ${tokenInfo.symbol} (Attempt ${attempt}/${this.maxRetries})`);

        const result = await this.executeBuy(tokenInfo);

        if (result.success) {
          logger.info(`✅ Successfully bought ${tokenInfo.symbol}!`);
          logger.info(`   TX Hash: ${result.txHash}`);
          logger.info(`   Tokens Received: ${result.tokensBought}`);
          logger.info(`   Gas Used: ${result.gasUsed}`);
          return result;
        }
      } catch (error: any) {
        lastError = error;
        logger.error(`❌ Buy attempt ${attempt} failed:`, error.message);

        if (attempt < this.maxRetries) {
          const delay = 1000 * attempt;
          logger.info(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Max retry attempts reached',
    };
  }

  /**
   * Execute the actual buy transaction
   */
  private async executeBuy(tokenInfo: TokenInfo): Promise<TradeResult> {
    const amountIn = ethers.utils.parseEther(config.buyAmount);
    const path = [config.wbnbAddress, tokenInfo.address];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Calculate minimum amount out with slippage
    const amountOutMin = await this.calculateMinAmountOut(amountIn, path);

    logger.info(`📊 Trade Parameters:`);
    logger.info(`   Amount In: ${config.buyAmount} BNB`);
    logger.info(`   Min Amount Out: ${ethers.utils.formatUnits(amountOutMin, tokenInfo.decimals)} ${tokenInfo.symbol}`);
    logger.info(`   Slippage: ${config.slippageBps / 100}%`);

    // Check balance
    const balance = await web3Provider.wallet.getBalance();
    if (balance.lt(amountIn)) {
      throw new Error(`Insufficient balance. Have: ${ethers.utils.formatEther(balance)} BNB, Need: ${config.buyAmount} BNB`);
    }

    // Prepare transaction
    const txData = await this.routerContract.populateTransaction.swapExactETHForTokens(
      amountOutMin,
      path,
      config.walletAddress,
      deadline,
      { value: amountIn }
    );

    // Execute based on MEV settings
    let txHash: string;

    if (config.enableFrontrun && tokenInfo.txHash) {
      // If we detected this in mempool and frontrun is enabled
      const pendingTx = await web3Provider.httpProvider.getTransaction(tokenInfo.txHash);
      if (pendingTx && !pendingTx.blockNumber) {
        txHash = await mevExecutor.executeFrontrun(pendingTx as any, txData);
      } else {
        txHash = await mevExecutor.executeWithPrecisionTiming(txData);
      }
    } else if (config.enableBackrun && tokenInfo.txHash) {
      const pendingTx = await web3Provider.httpProvider.getTransaction(tokenInfo.txHash);
      if (pendingTx && !pendingTx.blockNumber) {
        txHash = await mevExecutor.executeBackrun(pendingTx as any, txData);
      } else {
        txHash = await mevExecutor.executeWithPrecisionTiming(txData);
      }
    } else {
      // Standard execution with precision timing
      txHash = await mevExecutor.executeWithPrecisionTiming(txData);
    }

    // Wait for transaction confirmation
    logger.info(`⏳ Waiting for transaction confirmation...`);
    const receipt = await web3Provider.httpProvider.waitForTransaction(txHash, 1);

    if (receipt.status === 0) {
      throw new Error('Transaction failed on-chain');
    }

    // Get token balance to determine how much we bought
    const tokenContract = new ethers.Contract(
      tokenInfo.address,
      ERC20_ABI,
      web3Provider.httpProvider
    );
    const tokenBalance = await tokenContract.balanceOf(config.walletAddress);

    return {
      success: true,
      txHash: receipt.transactionHash,
      gasUsed: receipt.gasUsed.toString(),
      tokensBought: ethers.utils.formatUnits(tokenBalance, tokenInfo.decimals),
    };
  }

  /**
   * Calculate minimum amount out with slippage tolerance
   */
  private async calculateMinAmountOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    try {
      const amounts = await this.routerContract.getAmountsOut(amountIn, path);
      const amountOut = amounts[amounts.length - 1];

      // Apply slippage tolerance
      const slippage = ethers.BigNumber.from(config.slippageBps);
      const minAmountOut = amountOut.mul(10000 - slippage.toNumber()).div(10000);

      return minAmountOut;
    } catch (error) {
      logger.warn('Could not get amounts out, using zero minimum (risky!)');
      return ethers.BigNumber.from(0);
    }
  }

  /**
   * Sell tokens back to BNB
   */
  public async sellToken(
    tokenAddress: string,
    amount: string,
    decimals: number = 18
  ): Promise<TradeResult> {
    try {
      logger.info(`💸 Selling ${amount} tokens...`);

      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        web3Provider.wallet
      );

      const amountIn = ethers.utils.parseUnits(amount, decimals);
      const path = [tokenAddress, config.wbnbAddress];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Check allowance
      const allowance = await tokenContract.allowance(
        config.walletAddress,
        config.pancakeRouterAddress
      );

      if (allowance.lt(amountIn)) {
        logger.info('📝 Approving token spend...');
        const approveTx = await tokenContract.approve(
          config.pancakeRouterAddress,
          ethers.constants.MaxUint256
        );
        await approveTx.wait();
        logger.info('✅ Token approved');
      }

      const amountOutMin = await this.calculateMinAmountOut(amountIn, path);

      const tx = await this.routerContract.swapExactTokensForETH(
        amountIn,
        amountOutMin,
        path,
        config.walletAddress,
        deadline
      );

      logger.info(`⏳ Waiting for sell transaction...`);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error: any) {
      logger.error('Sell failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get current token price in BNB
   */
  public async getTokenPrice(tokenAddress: string): Promise<string> {
    try {
      const amountIn = ethers.utils.parseEther('1');
      const path = [config.wbnbAddress, tokenAddress];
      const amounts = await this.routerContract.getAmountsOut(amountIn, path);
      return ethers.utils.formatEther(amounts[1]);
    } catch (error) {
      logger.error('Failed to get token price:', error);
      return '0';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const tradeExecutor = new TradeExecutor();

