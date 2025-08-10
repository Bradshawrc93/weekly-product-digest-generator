const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'weekly-digest-generator' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Debug log file (only in development)
    ...(process.env.NODE_ENV === 'development' ? [
      new winston.transports.File({
        filename: path.join(logsDir, 'debug.log'),
        level: 'debug',
        maxsize: 5242880, // 5MB
        maxFiles: 3,
      })
    ] : []),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Add console transport for production if explicitly enabled
if (process.env.LOG_TO_CONSOLE === 'true') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Helper methods for structured logging
logger.logSquad = (level, message, squad, meta = {}) => {
  logger.log(level, message, { squad, ...meta });
};

logger.logOperation = (level, message, operation, meta = {}) => {
  logger.log(level, message, { operation, ...meta });
};

logger.logApiCall = (level, message, api, endpoint, meta = {}) => {
  logger.log(level, message, { api, endpoint, ...meta });
};

// Export logger instance
module.exports = { logger };
