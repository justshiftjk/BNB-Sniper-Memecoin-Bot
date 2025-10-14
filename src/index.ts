import { SniperBot } from './bot/sniperBot';
import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

async function main() {
  try {
    // Display banner
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║           🎯 BNB SNIPER BOT - FOUR.MEME 🎯              ║');
    console.log('║                                                           ║');
    console.log('║         High-Speed Token Sniper with MEV Support          ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    // Validate configuration
    logger.info('Validating configuration...');
    validateConfig();
    logger.info('✅ Configuration valid');

    // Create and start bot
    const bot = new SniperBot();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('');
      logger.info('Received SIGINT signal, shutting down gracefully...');
      await bot.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('');
      logger.info('Received SIGTERM signal, shutting down gracefully...');
      await bot.stop();
      process.exit(0);
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Start the bot
    await bot.start();

  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the bot
main();

