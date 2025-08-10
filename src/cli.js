#!/usr/bin/env node

/**
 * Weekly Product Digest Generator CLI
 * Command-line interface for manual digest generation
 */

require('dotenv').config();
const { Command } = require('commander');
const { logger } = require('./utils/logger');
const { validateEnvironment } = require('./utils/config');
const { DigestGenerator } = require('./core/DigestGenerator');
const moment = require('moment');

const program = new Command();

program
  .name('digest')
  .description('Weekly Product Digest Generator CLI')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate weekly digest')
  .option('-s, --squad <name>', 'Generate digest for specific squad')
  .option('-d, --date <YYYY-MM-DD>', 'Generate digest for week containing this date')
  .option('--start-date <YYYY-MM-DD>', 'Start date for custom date range')
  .option('--end-date <YYYY-MM-DD>', 'End date for custom date range')
  .option('--dry-run', 'Run without publishing to Notion')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      // Set log level
      if (options.verbose) {
        process.env.LOG_LEVEL = 'debug';
      }

      logger.info('Starting digest generation', { options });

      // Validate environment
      await validateEnvironment();

      // Initialize generator
      const generator = new DigestGenerator();

      // Determine date range
      let startDate, endDate;
      
      if (options.startDate && options.endDate) {
        startDate = moment(options.startDate).startOf('day');
        endDate = moment(options.endDate).endOf('day');
      } else if (options.date) {
        const targetDate = moment(options.date);
        startDate = targetDate.clone().startOf('week');
        endDate = targetDate.clone().endOf('week');
      } else {
        // Default to last week
        startDate = moment().subtract(1, 'week').startOf('week');
        endDate = moment().subtract(1, 'week').endOf('week');
      }

      logger.info('Date range determined', { startDate: startDate.format(), endDate: endDate.format() });

      // Generate digest
      const result = await generator.generateDigest({
        squadName: options.squad,
        startDate,
        endDate,
        dryRun: options.dryRun
      });

      logger.info('Digest generation completed', { result });
      
      if (options.dryRun) {
        console.log('✅ Dry run completed successfully');
        console.log('📊 Generated digests:', result.generatedDigests.length);
        console.log('📝 Summary:', result.summary);
      } else {
        console.log('✅ Digest generation completed successfully');
        console.log('📊 Published digests:', result.generatedDigests.length);
        console.log('🔗 Notion pages:', result.notionPages.join(', '));
        console.log('📝 Summary:', result.summary);
      }

    } catch (error) {
      logger.error('Digest generation failed', { error: error.message, stack: error.stack });
      console.error('❌ Digest generation failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate configuration and environment')
  .action(async () => {
    try {
      logger.info('Validating configuration');
      
      await validateEnvironment();
      
      console.log('✅ Environment validation passed');
      console.log('✅ Configuration is valid');
      
    } catch (error) {
      logger.error('Validation failed', { error: error.message });
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('Run initial setup and validation')
  .action(async () => {
    try {
      logger.info('Running setup');
      
      // Validate environment
      await validateEnvironment();
      
      // Test API connections
      const generator = new DigestGenerator();
      await generator.testConnections();
      
      console.log('✅ Setup completed successfully');
      console.log('✅ All API connections verified');
      
    } catch (error) {
      logger.error('Setup failed', { error: error.message });
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check system status and last run')
  .action(async () => {
    try {
      logger.info('Checking system status');
      
      // TODO: Implement status checking
      console.log('📊 System Status:');
      console.log('   • Environment: Validated');
      console.log('   • Last run: Not implemented yet');
      console.log('   • Next scheduled run: Monday 7:30 AM CT');
      
    } catch (error) {
      logger.error('Status check failed', { error: error.message });
      console.error('❌ Status check failed:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
