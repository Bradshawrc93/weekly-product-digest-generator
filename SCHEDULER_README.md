# Weekly Report Scheduler

This scheduler automatically runs your weekly Jira report generation every Monday at 6:00 AM EST.

## Features

- ⏰ **Automated Scheduling**: Runs every Monday at 6:00 AM EST (11:00 AM UTC)
- 🔄 **Continuous Operation**: Keeps running until manually stopped
- 📊 **Status Monitoring**: Logs status every hour
- 🛡️ **Graceful Shutdown**: Handles shutdown signals properly
- 🧪 **Testing Support**: Includes test scripts for verification

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Test the Scheduler

Before running the actual scheduler, test that everything works:

```bash
npm run scheduler:test
```

This will run a manual report generation to verify all connections and functionality.

### 3. Start the Scheduler

#### Development Mode (with auto-restart)
```bash
npm run scheduler:dev
```

#### Production Mode
```bash
npm run scheduler
```

## Usage

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run scheduler` | Start the scheduler in production mode |
| `npm run scheduler:dev` | Start the scheduler in development mode with auto-restart |
| `npm run scheduler:test` | Test the scheduler functionality manually |
| `npm run generate-report` | Generate a report manually (one-time) |

### Manual Report Generation

You can still generate reports manually using the existing commands:

```bash
# Generate previous week report
npm start

# Generate current week report
npm start current

# Generate custom date range report
npm start custom 2024-01-01 2024-01-07
```

## Deployment Options

### Option 1: Server/VM Deployment

1. **Set up a server or VM** that can run continuously
2. **Install Node.js** (version 18 or higher)
3. **Clone your repository** and install dependencies
4. **Configure environment variables** (Jira API, Notion API, etc.)
5. **Start the scheduler**:
   ```bash
   npm run scheduler
   ```

### Option 2: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["npm", "run", "scheduler"]
```

### Option 3: Cloud Platform Deployment

#### Heroku
1. Create a `Procfile`:
   ```
   worker: npm run scheduler
   ```
2. Deploy to Heroku with the worker dyno

#### AWS EC2
1. Launch an EC2 instance
2. Install Node.js and PM2
3. Use PM2 to keep the scheduler running:
   ```bash
   pm2 start src/runScheduler.js --name "weekly-report-scheduler"
   pm2 startup
   pm2 save
   ```

#### Google Cloud Run
1. Create a `Dockerfile` (see Option 2)
2. Deploy to Cloud Run with continuous execution

### Option 4: Cron Job (Alternative)

If you prefer using system cron instead of the Node.js scheduler:

```bash
# Add to crontab (crontab -e)
0 6 * * 1 cd /path/to/your/app && npm start > /var/log/weekly-report.log 2>&1
```

## Configuration

### Environment Variables

Make sure your `.env` file contains all necessary API keys and configuration:

```env
# Jira Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token

# Notion Configuration
NOTION_API_KEY=your-notion-api-key
NOTION_DATABASE_ID=your-database-id

# Logging
LOG_LEVEL=info
```

### Timezone Configuration

The scheduler is configured to run at **6:00 AM EST** (11:00 AM UTC) every Monday. The timezone is set to UTC to avoid daylight saving time issues.

To change the schedule, modify the cron expression in `src/scheduler.js`:

```javascript
// Current: Every Monday at 6:00 AM EST (11:00 AM UTC)
this.scheduledJob = cron.schedule('0 11 * * 1', async () => {
  await this.runScheduledReport();
}, {
  scheduled: true,
  timezone: 'UTC'
});
```

## Monitoring and Logging

### Log Files

The scheduler uses Winston for logging. Logs are written to:
- Console output
- Log files in the `logs/` directory

### Status Monitoring

The scheduler logs its status every hour, including:
- Whether it's running
- Next scheduled run time
- Current schedule configuration

### Error Handling

If a scheduled run fails:
- The error is logged with full stack trace
- The scheduler continues running for the next scheduled time
- You can add notification logic (email, Slack, etc.) in the error handler

## Troubleshooting

### Common Issues

1. **Scheduler not starting**
   - Check that all environment variables are set
   - Verify API connections work manually first
   - Check Node.js version (requires 18+)

2. **Reports not generating**
   - Test manually with `npm run scheduler:test`
   - Check logs for specific error messages
   - Verify Jira and Notion API permissions

3. **Timezone issues**
   - The scheduler uses UTC internally
   - 6:00 AM EST = 11:00 AM UTC (standard time)
   - 6:00 AM EDT = 10:00 AM UTC (daylight time)

### Testing

Always test before deploying:

```bash
# Test the scheduler functionality
npm run scheduler:test

# Test manual report generation
npm start

# Test in development mode
npm run scheduler:dev
```

## Security Considerations

1. **API Keys**: Store all API keys in environment variables
2. **Server Security**: Ensure your deployment server is properly secured
3. **Log Rotation**: Implement log rotation for production deployments
4. **Monitoring**: Set up monitoring and alerting for the scheduler process

## Support

If you encounter issues:
1. Check the logs for error messages
2. Test manually with `npm run scheduler:test`
3. Verify all environment variables are set correctly
4. Ensure API permissions are sufficient
