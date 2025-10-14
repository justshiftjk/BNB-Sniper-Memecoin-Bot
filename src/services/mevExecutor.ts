import { ethers } from 'ethers';
import { web3Provider } from '../utils/web3Provider';
import { logger } from '../utils/logger';
import { config } from '../config';
import { MEVBundle, PendingTransaction } from '../types';

export class MEVExecutor {
  private pendingBundles: Map<number, MEVBundle> = new Map();

  /**
   * Execute front-run transaction
   * Sends transaction with higher gas to be included before target tx
   */
  public async executeFrontrun(
    targetTx: PendingTransaction,
    ourTxData: ethers.PopulatedTransaction
  ): Promise<string> {
    try {
      logger.info(`⚡ Executing FRONTRUN for tx ${targetTx.hash.slice(0, 10)}...`);

      // Calculate gas price to frontrun (slightly higher than target)
      const targetGasPrice = ethers.BigNumber.from(targetTx.gasPrice);
      const frontrunGasPrice = targetGasPrice.mul(110).div(100); // 10% higher

      // Ensure we don't exceed max gas price
      const maxGas = ethers.utils.parseUnits(config.maxGasPrice, 'gwei');
      const gasPrice = frontrunGasPrice.gt(maxGas) ? maxGas : frontrunGasPrice;

      const nonce = await web3Provider.getNonce();

      const transaction = {
        ...ourTxData,
        gasPrice,
        gasLimit: config.gasLimit,
        nonce,
        chainId: config.chainId,
      };

      const signedTx = await web3Provider.wallet.signTransaction(transaction);
      const tx = await web3Provider.httpProvider.sendTransaction(signedTx);

      logger.info(`✅ Frontrun transaction sent: ${tx.hash}`);
      logger.info(`   Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} GWEI`);
      logger.info(`   Nonce: ${nonce}`);

      return tx.hash;
    } catch (error) {
      logger.error('Frontrun execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute back-run transaction
   * Sends transaction to be included right after target tx in same block
   */
  public async executeBackrun(
    targetTx: PendingTransaction,
    ourTxData: ethers.PopulatedTransaction
  ): Promise<string> {
    try {
      logger.info(`⚡ Executing BACKRUN for tx ${targetTx.hash.slice(0, 10)}...`);

      // Use same or slightly higher gas price as target
      const targetGasPrice = ethers.BigNumber.from(targetTx.gasPrice);
      const backrunGasPrice = targetGasPrice.mul(105).div(100); // 5% higher

      const maxGas = ethers.utils.parseUnits(config.maxGasPrice, 'gwei');
      const gasPrice = backrunGasPrice.gt(maxGas) ? maxGas : backrunGasPrice;

      const nonce = await web3Provider.getNonce();

      const transaction = {
        ...ourTxData,
        gasPrice,
        gasLimit: config.gasLimit,
        nonce,
        chainId: config.chainId,
      };

      const signedTx = await web3Provider.wallet.signTransaction(transaction);
      const tx = await web3Provider.httpProvider.sendTransaction(signedTx);

      logger.info(`✅ Backrun transaction sent: ${tx.hash}`);
      logger.info(`   Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} GWEI`);

      return tx.hash;
    } catch (error) {
      logger.error('Backrun execution failed:', error);
      throw error;
    }
  }

  /**
   * Create and submit MEV bundle (advanced)
   * Bundles multiple transactions to be included in specific order
   */
  public async submitBundle(bundle: MEVBundle): Promise<boolean> {
    try {
      logger.info(`📦 Submitting MEV bundle for block ${bundle.blockNumber}`);

      // Note: This requires MEV relay infrastructure like Flashbots
      // For BSC, you'd need to use services like BNB MEV or similar
      
      this.pendingBundles.set(bundle.blockNumber, bundle);

      logger.warn('MEV bundle submission requires relay integration (Flashbots/BNB MEV)');
      
      return true;
    } catch (error) {
      logger.error('Bundle submission failed:', error);
      return false;
    }
  }

  /**
   * Calculate optimal gas price for transaction inclusion
   */
  public async calculateOptimalGas(targetBlock: number): Promise<ethers.BigNumber> {
    const baseGasPrice = await web3Provider.getGasPrice();
    const currentBlock = await web3Provider.getCurrentBlock();

    // If target block is current or next, use higher gas
    if (targetBlock - currentBlock <= 1) {
      return baseGasPrice.mul(config.gasPriceMultiplier * 100).div(100);
    }

    return baseGasPrice;
  }

  /**
   * Execute transaction with optimal timing
   */
  public async executeWithPrecisionTiming(
    txData: ethers.PopulatedTransaction,
    targetBlockNumber?: number
  ): Promise<string> {
    try {
      const currentBlock = await web3Provider.getCurrentBlock();
      const targetBlock = targetBlockNumber || currentBlock + 1;

      logger.info(`🎯 Executing transaction with precision timing for block ${targetBlock}`);

      const gasPrice = await this.calculateOptimalGas(targetBlock);
      const nonce = await web3Provider.getNonce();

      const transaction = {
        ...txData,
        gasPrice,
        gasLimit: config.gasLimit,
        nonce,
        chainId: config.chainId,
      };

      const signedTx = await web3Provider.wallet.signTransaction(transaction);
      const tx = await web3Provider.httpProvider.sendTransaction(signedTx);

      logger.info(`✅ Precision transaction sent: ${tx.hash}`);
      
      return tx.hash;
    } catch (error) {
      logger.error('Precision timing execution failed:', error);
      throw error;
    }
  }
}

export const mevExecutor = new MEVExecutor();

