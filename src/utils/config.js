const fs = require('fs');
const path = require('path');
require('dotenv').config();

class Config {
  constructor() {
    this.loadEnvironmentVariables();
    this.loadSquadConfiguration();
  }

  loadEnvironmentVariables() {
    this.jira = {
      baseUrl: process.env.JIRA_BASE_URL,
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN
    };

    this.notion = {
      apiKey: process.env.NOTION_API_KEY,
      databaseId: process.env.NOTION_DATABASE_ID
    };

    this.settings = {
      nodeEnv: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      staleTicketThreshold: 5,
      lookbackDays: 7,
      dateFormat: 'MMM D, YYYY'
    };

    this.validateEnvironmentVariables();
  }

  loadSquadConfiguration() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'squads.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      this.squads = config.squads;
      this.statusCategories = config.statusCategories;
      this.settings = { ...this.settings, ...config.settings };
      
      this.validateSquadConfiguration();
    } catch (error) {
      throw new Error(`Failed to load squad configuration: ${error.message}`);
    }
  }

  validateEnvironmentVariables() {
    const required = [
      'JIRA_BASE_URL',
      'JIRA_EMAIL', 
      'JIRA_API_TOKEN',
      'NOTION_API_KEY',
      'NOTION_DATABASE_ID'
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  validateSquadConfiguration() {
    if (!this.squads || this.squads.length === 0) {
      throw new Error('No squads configured');
    }

    this.squads.forEach(squad => {
      if (!squad.name || !squad.jiraUuid) {
        throw new Error(`Invalid squad configuration: ${JSON.stringify(squad)}`);
      }
    });
  }

  getSquadByUuid(uuid) {
    return this.squads.find(squad => squad.jiraUuid === uuid);
  }

  getSquadByName(name) {
    return this.squads.find(squad => squad.name === name);
  }

  getAllSquadUuids() {
    return this.squads.map(squad => squad.jiraUuid);
  }

  getAllSquadNames() {
    return this.squads.map(squad => squad.name);
  }

  getStatusCategory(status) {
    for (const [category, statuses] of Object.entries(this.statusCategories)) {
      if (statuses.includes(status)) {
        return category;
      }
    }
    return 'unknown';
  }
}

module.exports = new Config();
