const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write all logs to file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log')
    })
  ]
});

// Add request logging for API calls
logger.logApiCall = (method, url, statusCode, duration) => {
  logger.info('API Call', {
    method,
    url,
    statusCode,
    duration: `${duration}ms`
  });
};

// Add squad-specific logging
logger.logSquadData = (squadName, dataType, count) => {
  logger.info('Squad Data', {
    squad: squadName,
    type: dataType,
    count
  });
};

// Add metrics logging
logger.logMetrics = (metrics) => {
  logger.info('Weekly Metrics', metrics);
};

module.exports = { logger };
