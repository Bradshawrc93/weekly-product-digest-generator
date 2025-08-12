const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');
const DateUtils = require('./dateUtils');

class DataStorage {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Save weekly metrics data
   */
  saveWeeklyMetrics(dateRange, metrics) {
    try {
      const filename = `weekly-metrics-${DateUtils.formatForFile(dateRange.end)}.json`;
      const filepath = path.join(this.dataDir, filename);
      
      const data = {
        dateRange,
        generatedAt: DateUtils.getCurrentTimestamp(),
        squads: metrics
      };

      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      logger.info('Weekly metrics saved', { filename, squadCount: Object.keys(metrics).length });
      
      return filepath;
    } catch (error) {
      logger.error('Failed to save weekly metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Save detailed weekly data
   */
  saveWeeklyDetails(dateRange, details) {
    try {
      const filename = `weekly-details-${DateUtils.formatForFile(dateRange.end)}.json`;
      const filepath = path.join(this.dataDir, filename);
      
      const data = {
        dateRange,
        generatedAt: DateUtils.getCurrentTimestamp(),
        squads: details
      };

      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      logger.info('Weekly details saved', { filename, squadCount: Object.keys(details).length });
      
      return filepath;
    } catch (error) {
      logger.error('Failed to save weekly details', { error: error.message });
      throw error;
    }
  }

  /**
   * Load weekly metrics
   */
  loadWeeklyMetrics(dateRange) {
    try {
      const filename = `weekly-metrics-${DateUtils.formatForFile(dateRange.end)}.json`;
      const filepath = path.join(this.dataDir, filename);
      
      if (!fs.existsSync(filepath)) {
        return null;
      }

      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      logger.info('Weekly metrics loaded', { filename });
      
      return data;
    } catch (error) {
      logger.error('Failed to load weekly metrics', { error: error.message });
      return null;
    }
  }

  /**
   * Load weekly details
   */
  loadWeeklyDetails(dateRange) {
    try {
      const filename = `weekly-details-${DateUtils.formatForFile(dateRange.end)}.json`;
      const filepath = path.join(this.dataDir, filename);
      
      if (!fs.existsSync(filepath)) {
        return null;
      }

      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      logger.info('Weekly details loaded', { filename });
      
      return data;
    } catch (error) {
      logger.error('Failed to load weekly details', { error: error.message });
      return null;
    }
  }

  /**
   * Append to historical metrics
   */
  appendToHistoricalMetrics(dateRange, metrics) {
    try {
      const filepath = path.join(this.dataDir, 'historical-metrics.json');
      
      let historicalData = { weeklyData: [] };
      
      if (fs.existsSync(filepath)) {
        historicalData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      }

      const weeklyEntry = {
        dateRange: dateRange.display,
        startDate: dateRange.start,
        endDate: dateRange.end,
        squads: metrics
      };

      historicalData.weeklyData.push(weeklyEntry);
      
      // Keep only last 52 weeks (1 year) of data
      if (historicalData.weeklyData.length > 52) {
        historicalData.weeklyData = historicalData.weeklyData.slice(-52);
      }

      fs.writeFileSync(filepath, JSON.stringify(historicalData, null, 2));
      logger.info('Historical metrics updated', { 
        totalWeeks: historicalData.weeklyData.length,
        dateRange: dateRange.display 
      });
      
      return filepath;
    } catch (error) {
      logger.error('Failed to append to historical metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Load historical metrics
   */
  loadHistoricalMetrics() {
    try {
      const filepath = path.join(this.dataDir, 'historical-metrics.json');
      
      if (!fs.existsSync(filepath)) {
        return { weeklyData: [] };
      }

      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      logger.info('Historical metrics loaded', { totalWeeks: data.weeklyData.length });
      
      return data;
    } catch (error) {
      logger.error('Failed to load historical metrics', { error: error.message });
      return { weeklyData: [] };
    }
  }

  /**
   * Get all weekly metrics files
   */
  getAllWeeklyMetricsFiles() {
    try {
      const files = fs.readdirSync(this.dataDir);
      return files.filter(file => file.startsWith('weekly-metrics-') && file.endsWith('.json'));
    } catch (error) {
      logger.error('Failed to get weekly metrics files', { error: error.message });
      return [];
    }
  }

  /**
   * Clean up old data files (keep last 12 weeks)
   */
  cleanupOldData() {
    try {
      const files = this.getAllWeeklyMetricsFiles();
      const sortedFiles = files.sort().reverse();
      
      if (sortedFiles.length > 12) {
        const filesToDelete = sortedFiles.slice(12);
        
        filesToDelete.forEach(filename => {
          const filepath = path.join(this.dataDir, filename);
          fs.unlinkSync(filepath);
          logger.info('Deleted old data file', { filename });
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup old data', { error: error.message });
    }
  }
}

module.exports = new DataStorage();
