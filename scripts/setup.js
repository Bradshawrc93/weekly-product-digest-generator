#!/usr/bin/env node

/**
 * Setup script for Weekly Product Digest Generator
 * Validates configuration and tests API connections
 */

require('dotenv').config();
const { logger } = require('../src/utils/logger');
const { validateEnvironment, validateApiConnections, loadSquadConfig } = require('../src/utils/config');
const fs = require('fs');
const path = require('path');

async function setup() {
  console.log('🚀 Setting up Weekly Product Digest Generator...\n');

  try {
    // Step 1: Validate environment variables
    console.log('1️⃣ Validating environment variables...');
    await validateEnvironment();
    console.log('   ✅ Environment variables validated\n');

    // Step 2: Validate squad configuration
    console.log('2️⃣ Validating squad configuration...');
    const config = await loadSquadConfig();
    console.log(`   ✅ Squad configuration validated (${config.squads.length} squads)\n`);

    // Step 3: Test API connections
    console.log('3️⃣ Testing API connections...');
    const apiResults = await validateApiConnections();
    
    const successfulApis = Object.entries(apiResults)
      .filter(([_, success]) => success)
      .map(([api, _]) => api);
    
    const failedApis = Object.entries(apiResults)
      .filter(([_, success]) => !success)
      .map(([api, _]) => api);

    if (successfulApis.length > 0) {
      console.log(`   ✅ Successful connections: ${successfulApis.join(', ')}`);
    }
    
    if (failedApis.length > 0) {
      console.log(`   ❌ Failed connections: ${failedApis.join(', ')}`);
      console.log('   ⚠️  Some API connections failed. Check your configuration.\n');
    } else {
      console.log('   ✅ All API connections successful\n');
    }

    // Step 4: Create necessary directories
    console.log('4️⃣ Creating necessary directories...');
    const dirs = ['logs', 'data', 'cache'];
    
    for (const dir of dirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`   ✅ Created directory: ${dir}`);
      } else {
        console.log(`   ℹ️  Directory exists: ${dir}`);
      }
    }
    console.log('');

    // Step 5: Display configuration summary
    console.log('5️⃣ Configuration Summary:');
    console.log(`   • Squads configured: ${config.squads.length}`);
    console.log(`   • Squad names: ${config.squads.map(s => s.name).join(', ')}`);
    console.log(`   • Output database: ${config.globalSettings.outputNotionDatabaseId}`);
    console.log(`   • Run window: ${config.globalSettings.runWindow.startDay} ${config.globalSettings.runWindow.startTime} to ${config.globalSettings.runWindow.endDay} ${config.globalSettings.runWindow.endTime}`);
    console.log('');

    // Step 6: Next steps
    console.log('🎉 Setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review and update squad configuration in config/squads.json');
    console.log('2. Test the tool with: npm run digest generate -- --dry-run');
    console.log('3. Set up scheduled runs (cron job or similar)');
    console.log('4. Configure Slack slash commands (optional)');
    console.log('');
    console.log('For more information, see:');
    console.log('• README.md - Project overview and usage');
    console.log('• OPERATIONS.md - Detailed operational guide');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check that all required environment variables are set');
    console.error('2. Verify API keys and tokens are correct');
    console.error('3. Ensure squad configuration is valid');
    console.error('4. Check network connectivity to external APIs');
    console.error('');
    console.error('For detailed error information, check the logs in the logs/ directory.');
    
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setup();
}

module.exports = { setup };
