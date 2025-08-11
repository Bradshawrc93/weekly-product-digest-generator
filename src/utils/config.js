const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

// Environment variable validation schema
const envSchema = Joi.object({
  // Slack Configuration
  SLACK_BOT_TOKEN: Joi.string().pattern(/^xoxb-/).required(),
  SLACK_SIGNING_SECRET: Joi.string().min(1).required(),
  
  // Jira Configuration
  JIRA_BASE_URL: Joi.string().uri().required(),
  JIRA_EMAIL: Joi.string().email().required(),
  JIRA_API_TOKEN: Joi.string().min(1).required(),
  
  // Notion Configuration
  NOTION_API_KEY: Joi.string().pattern(/^secret_/).required(),
  NOTION_DATABASE_ID: Joi.string().min(1).required(),
  
  // GitHub Configuration - Disabled for now
  // GITHUB_TOKEN: Joi.string().min(1).optional(),
  // GITHUB_ORG: Joi.string().min(1).optional(),
  
  // AI Configuration
  OPENAI_API_KEY: Joi.string().min(1).required(),
  
  // Optional Configuration
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').default('development'),
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
  PORT: Joi.number().port().default(3000),
  
  // Optional Database/Redis
  DATABASE_URL: Joi.string().uri().optional(),
  REDIS_URL: Joi.string().uri().optional(),
  
  // Optional Logging
  LOG_TO_CONSOLE: Joi.boolean().default(false),
});

// Squad configuration validation schema
const squadMemberSchema = Joi.object({
  fullName: Joi.string().min(1).required(),
  slackHandle: Joi.string().pattern(/^@/).required(),
  githubUsername: Joi.string().min(1).required(),
  email: Joi.string().email().required(),
  role: Joi.string().min(1).required(),
});

const squadSchema = Joi.object({
  name: Joi.string().min(1).required(),
  description: Joi.string().optional(),
  members: Joi.array().items(squadMemberSchema).min(1).required(),
  jiraConfig: Joi.object({
    projectKey: Joi.string().min(1).required(),
    projectName: Joi.string().min(1).required(),
    workstreams: Joi.array().items(Joi.object({
      name: Joi.string().min(1).required(),
      key: Joi.string().min(1).required(),
      description: Joi.string().optional()
    })).min(1).required()
  }).required(),
  slackChannel: Joi.string().pattern(/^#/).optional(),
  notionRoadmapUrl: Joi.string().uri().optional(),
  githubRepos: Joi.array().items(Joi.string()).optional(),
  bitbucketRepos: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

const globalSettingsSchema = Joi.object({
  sharedSlackChannels: Joi.array().items(Joi.string().pattern(/^#/)).min(1).required(),
  outputNotionDatabaseId: Joi.string().min(1).required(),
  runWindow: Joi.object({
    startDay: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
    startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    endDay: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
    endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  }).required(),
  jiraCustomFields: Joi.object({
    targetQuarter: Joi.string().optional(),
    confidence: Joi.string().optional(),
    epicLink: Joi.string().optional(),
    team: Joi.string().optional(),
    storyPoints: Joi.string().optional(),
  }).optional(),
  jiraHierarchy: Joi.object({
    workstreamIssueType: Joi.string().optional(),
    epicIssueType: Joi.string().optional(),
    storyIssueType: Joi.string().optional(),
    taskIssueType: Joi.string().optional(),
    bugIssueType: Joi.string().optional(),
  }).optional(),
  riskThresholds: Joi.object({
    noMovementDays: Joi.number().integer().min(1).default(14),
    overdueDays: Joi.number().integer().min(1).default(7),
    confidenceDropThreshold: Joi.number().min(0).max(1).default(0.3),
  }).optional(),
  aiSettings: Joi.object({
    model: Joi.string().default('gpt-4'),
    maxTokens: Joi.number().integer().min(1).default(2000),
    temperature: Joi.number().min(0).max(2).default(0.3),
  }).optional(),
  notifications: Joi.object({
    slackChannel: Joi.string().pattern(/^#/).required(),
    mentionSquadLeads: Joi.boolean().default(true),
    includeExecutiveSummary: Joi.boolean().default(true),
  }).optional(),
});

const configSchema = Joi.object({
  squads: Joi.array().items(squadSchema).min(1).required(),
  globalSettings: globalSettingsSchema.required(),
});

/**
 * Validate environment variables
 */
async function validateEnvironment() {
  try {
    logger.info('Validating environment variables');
    
    const { error, value } = envSchema.validate(process.env, { 
      allowUnknown: true,
      stripUnknown: true 
    });
    
    if (error) {
      throw new Error(`Environment validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }
    
    logger.info('Environment variables validated successfully');
    return value;
  } catch (error) {
    logger.error('Environment validation failed', { error: error.message });
    throw error;
  }
}

/**
 * Load and validate squad configuration
 */
async function loadSquadConfig() {
  try {
    logger.info('Loading squad configuration');
    
    const configPath = path.join(process.cwd(), 'config', 'squads.json');
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Squad configuration file not found: ${configPath}`);
    }
    
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    const { error, value } = configSchema.validate(config);
    
    if (error) {
      throw new Error(`Squad configuration validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }
    
    logger.info('Squad configuration loaded and validated', { 
      squadCount: value.squads.length,
      squads: value.squads.map(s => s.name)
    });
    
    return value;
  } catch (error) {
    logger.error('Failed to load squad configuration', { error: error.message });
    throw error;
  }
}

/**
 * Get squad by name
 */
async function getSquadByName(squadName) {
  const config = await loadSquadConfig();
  const squad = config.squads.find(s => s.name === squadName);
  
  if (!squad) {
    throw new Error(`Squad not found: ${squadName}`);
  }
  
  return squad;
}

/**
 * Get all squads
 */
async function getAllSquads() {
  const config = await loadSquadConfig();
  return config.squads;
}

/**
 * Get global settings
 */
async function getGlobalSettings() {
  const config = await loadSquadConfig();
  return config.globalSettings;
}

/**
 * Validate API connections
 */
async function validateApiConnections() {
  const results = {
    slack: false,
    jira: false,
    notion: false,
    github: false,
    openai: false,
  };
  
  try {
    // Test Slack connection
    const { WebClient } = require('@slack/web-api');
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    await slack.auth.test();
    results.slack = true;
    logger.info('Slack API connection validated');
  } catch (error) {
    logger.error('Slack API connection failed', { error: error.message });
  }
  
  try {
    // Test Jira connection
    const axios = require('axios');
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    await axios.get(`${process.env.JIRA_BASE_URL}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    results.jira = true;
    logger.info('Jira API connection validated');
  } catch (error) {
    logger.error('Jira API connection failed', { error: error.message });
  }
  
  try {
    // Test Notion connection
    const { Client } = require('@notionhq/client');
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    await notion.databases.retrieve({ database_id: process.env.NOTION_DATABASE_ID });
    results.notion = true;
    logger.info('Notion API connection validated');
  } catch (error) {
    logger.error('Notion API connection failed', { error: error.message });
  }
  
  try {
    // Test GitHub connection
    const axios = require('axios');
    await axios.get(`https://api.github.com/orgs/${process.env.GITHUB_ORG}`, {
      headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` }
    });
    results.github = true;
    logger.info('GitHub API connection validated');
  } catch (error) {
    logger.error('GitHub API connection failed', { error: error.message });
  }
  
  try {
    // Test OpenAI connection
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    await openai.models.list();
    results.openai = true;
    logger.info('OpenAI API connection validated');
  } catch (error) {
    logger.error('OpenAI API connection failed', { error: error.message });
  }
  
  return results;
}

module.exports = {
  validateEnvironment,
  loadSquadConfig,
  getSquadByName,
  getAllSquads,
  getGlobalSettings,
  validateApiConnections,
};
