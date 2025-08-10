#!/usr/bin/env node

/**
 * Configuration validation script
 * Validates environment variables and squad configuration
 */

require('dotenv').config();
const { logger } = require('../src/utils/logger');
const { validateEnvironment, loadSquadConfig } = require('../src/utils/config');

async function validateConfig() {
  console.log('🔍 Validating configuration...\n');

  try {
    // Validate environment variables
    console.log('📋 Environment Variables:');
    const envVars = [
      'SLACK_BOT_TOKEN',
      'SLACK_SIGNING_SECRET',
      'JIRA_BASE_URL',
      'JIRA_EMAIL',
      'JIRA_API_TOKEN',
      'NOTION_API_KEY',
      'NOTION_DATABASE_ID',
      'GITHUB_TOKEN',
      'GITHUB_ORG',
      'OPENAI_API_KEY'
    ];

    for (const varName of envVars) {
      const value = process.env[varName];
      if (value) {
        const maskedValue = value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : '***';
        console.log(`   ✅ ${varName}: ${maskedValue}`);
      } else {
        console.log(`   ❌ ${varName}: Not set`);
      }
    }
    console.log('');

    await validateEnvironment();
    console.log('✅ Environment validation passed\n');

    // Validate squad configuration
    console.log('👥 Squad Configuration:');
    const config = await loadSquadConfig();
    
    console.log(`   📊 Total squads: ${config.squads.length}`);
    
    for (const squad of config.squads) {
      console.log(`   • ${squad.name}:`);
      console.log(`     - Members: ${squad.members.length}`);
      console.log(`     - Jira projects: ${squad.jiraProjectKeys.join(', ')}`);
      console.log(`     - GitHub repos: ${squad.githubRepos.join(', ')}`);
      if (squad.slackChannel) {
        console.log(`     - Slack channel: ${squad.slackChannel}`);
      }
    }
    console.log('');

    // Validate global settings
    console.log('⚙️  Global Settings:');
    const { globalSettings } = config;
    console.log(`   • Output database: ${globalSettings.outputNotionDatabaseId}`);
    console.log(`   • Run window: ${globalSettings.runWindow.startDay} ${globalSettings.runWindow.startTime} to ${globalSettings.runWindow.endDay} ${globalSettings.runWindow.endTime}`);
    console.log(`   • Shared channels: ${globalSettings.sharedSlackChannels.join(', ')}`);
    
    if (globalSettings.jiraCustomFields) {
      console.log(`   • Jira custom fields: ${Object.keys(globalSettings.jiraCustomFields).join(', ')}`);
    }
    
    if (globalSettings.riskThresholds) {
      console.log(`   • Risk thresholds: ${JSON.stringify(globalSettings.riskThresholds)}`);
    }
    
    if (globalSettings.aiSettings) {
      console.log(`   • AI settings: ${globalSettings.aiSettings.model}, ${globalSettings.aiSettings.maxTokens} tokens`);
    }
    console.log('');

    console.log('✅ Configuration validation completed successfully!');

  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    console.error('');
    console.error('Please fix the issues above and try again.');
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  validateConfig();
}

module.exports = { validateConfig };
