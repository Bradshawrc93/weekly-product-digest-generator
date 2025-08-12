const fs = require('fs');
const path = require('path');
const DateUtils = require('./dateUtils');
const { logger } = require('./logger');

class AIDataPreparer {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
  }

  /**
   * Get the 4 most recent weeks of data files
   */
  getRecentWeeksData(numWeeks = 4) {
    try {
      const files = fs.readdirSync(this.dataDir);
      const metricsFiles = files.filter(file => file.startsWith('weekly-metrics-') && file.endsWith('.json'));
      const detailsFiles = files.filter(file => file.startsWith('weekly-details-') && file.endsWith('.json'));
      
      // Sort files by date (newest first)
      const sortedMetricsFiles = metricsFiles.sort().reverse();
      const sortedDetailsFiles = detailsFiles.sort().reverse();
      
      const recentData = [];
      
      for (let i = 0; i < Math.min(numWeeks, sortedMetricsFiles.length); i++) {
        const metricsFile = sortedMetricsFiles[i];
        const detailsFile = sortedDetailsFiles[i];
        
        if (metricsFile && detailsFile) {
          const weekLabel = this.getWeekLabel(i);
          const metricsData = this.loadFile(metricsFile);
          const detailsData = this.loadFile(detailsFile);
          
          recentData.push({
            week: weekLabel,
            metrics: metricsData,
            details: detailsData,
            files: {
              metrics: metricsFile,
              details: detailsFile
            }
          });
        }
      }
      
      logger.info('Prepared AI data', { 
        weeksCollected: recentData.length,
        totalFiles: recentData.length * 2 
      });
      
      return recentData;
    } catch (error) {
      logger.error('Failed to prepare AI data', { error: error.message });
      throw error;
    }
  }

  /**
   * Load a JSON file from the data directory
   */
  loadFile(filename) {
    try {
      const filepath = path.join(this.dataDir, filename);
      if (!fs.existsSync(filepath)) {
        return null;
      }
      
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      return data;
    } catch (error) {
      logger.warn('Failed to load file', { filename, error: error.message });
      return null;
    }
  }

  /**
   * Get human-readable week label
   */
  getWeekLabel(index) {
    const labels = ['Current Week', 'Previous Week', 'Two Weeks Ago', 'Three Weeks Ago'];
    return labels[index] || `Week ${index + 1}`;
  }

  /**
   * Create a summary of available data for AI analysis
   */
  createDataSummary(recentData) {
    const summary = {
      totalWeeks: recentData.length,
      weeks: [],
      overallStats: {
        totalSquads: 0,
        totalCompleted: 0,
        totalStale: 0,
        totalBlocked: 0,
        totalCreated: 0
      }
    };

          recentData.forEach((weekData, index) => {
        const weekSummary = {
          week: weekData.week,
          dateRange: weekData.metrics?.dateRange?.display || weekData.metrics?.dateRange || 'Unknown',
          squads: {},
        totals: {
          completed: 0,
          stale: 0,
          blocked: 0,
          created: 0,
          updated: 0,
          inProgress: 0
        }
      };

      if (weekData.metrics?.squads) {
        Object.entries(weekData.metrics.squads).forEach(([squadName, metrics]) => {
          weekSummary.squads[squadName] = metrics;
          weekSummary.totals.completed += metrics.done || 0;
          weekSummary.totals.stale += metrics.stale || 0;
          weekSummary.totals.blocked += metrics.blocked || 0;
          weekSummary.totals.created += metrics.created || 0;
          weekSummary.totals.updated += metrics.updated || 0;
          weekSummary.totals.inProgress += metrics.inProgress || 0;
        });
      }

      summary.weeks.push(weekSummary);
      
      // Add to overall stats
      summary.overallStats.totalCompleted += weekSummary.totals.completed;
      summary.overallStats.totalStale += weekSummary.totals.stale;
      summary.overallStats.totalBlocked += weekSummary.totals.blocked;
      summary.overallStats.totalCreated += weekSummary.totals.created;
      
      if (index === 0) {
        summary.overallStats.totalSquads = Object.keys(weekSummary.squads).length;
      }
    });

    return summary;
  }

  /**
   * Generate a formatted data package for AI analysis
   */
  generateAIDataPackage() {
    try {
      const recentData = this.getRecentWeeksData(4);
      const summary = this.createDataSummary(recentData);
      
      const dataPackage = {
        metadata: {
          generatedAt: new Date().toISOString(),
          totalWeeks: recentData.length,
          dataFiles: recentData.map(week => week.files)
        },
        summary: summary,
        detailedData: recentData
      };

      // Save the data package for easy access
      const packageFile = path.join(this.dataDir, 'ai-analysis-package.json');
      fs.writeFileSync(packageFile, JSON.stringify(dataPackage, null, 2));
      
      logger.info('AI data package generated', { 
        packageFile: 'ai-analysis-package.json',
        totalWeeks: recentData.length 
      });
      
      return dataPackage;
    } catch (error) {
      logger.error('Failed to generate AI data package', { error: error.message });
      throw error;
    }
  }

  /**
   * Get file paths for manual AI analysis
   */
  getFilePathsForAI() {
    try {
      const recentData = this.getRecentWeeksData(4);
      const filePaths = [];
      
      recentData.forEach(weekData => {
        filePaths.push({
          week: weekData.week,
          metricsFile: path.join(this.dataDir, weekData.files.metrics),
          detailsFile: path.join(this.dataDir, weekData.files.details)
        });
      });
      
      return filePaths;
    } catch (error) {
      logger.error('Failed to get file paths for AI', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AIDataPreparer();
