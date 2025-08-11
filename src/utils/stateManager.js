const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

class StateManager {
  constructor() {
    this.stateFile = path.join(process.cwd(), 'data', 'last-run-state.json');
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.stateFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  async getLastRunTimestamp() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        return state.lastRunTimestamp ? new Date(state.lastRunTimestamp) : null;
      }
    } catch (error) {
      logger.warn('Failed to read last run state', { error: error.message });
    }
    return null;
  }

  async saveLastRunTimestamp(timestamp) {
    try {
      const state = {
        lastRunTimestamp: timestamp.toISOString(),
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
      logger.info('Saved last run timestamp', { timestamp: timestamp.toISOString() });
    } catch (error) {
      logger.error('Failed to save last run timestamp', { error: error.message });
    }
  }

  async getChangeTrackingState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        return state.changeTracking || {};
      }
    } catch (error) {
      logger.warn('Failed to read change tracking state', { error: error.message });
    }
    return {};
  }

  async saveChangeTrackingState(changeState) {
    try {
      const existingState = fs.existsSync(this.stateFile) 
        ? JSON.parse(fs.readFileSync(this.stateFile, 'utf8')) 
        : {};
      
      const state = {
        ...existingState,
        changeTracking: changeState,
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
      logger.info('Saved change tracking state');
    } catch (error) {
      logger.error('Failed to save change tracking state', { error: error.message });
    }
  }
}

module.exports = { StateManager };
