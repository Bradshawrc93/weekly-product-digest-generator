# Weekly Report Scheduler - Deployment Guide

Your weekly Jira report generator is now set up to run automatically every Monday at 6:00 AM EST! Here are all the deployment options available to you.

## 🎯 Quick Start (Recommended)

### 1. Test Everything Works
```bash
npm run scheduler:test
```

### 2. Start the Scheduler
```bash
# Development mode (with auto-restart)
npm run scheduler:dev

# Production mode
npm run scheduler
```

## 🚀 Deployment Options

### Option 1: Local Server/VM (Most Reliable)

**Best for**: Companies with their own infrastructure

1. **Set up a server** (AWS EC2, Google Compute Engine, DigitalOcean, etc.)
2. **Install Node.js 18+**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. **Clone your repository** and install dependencies:
   ```bash
   git clone <your-repo>
   cd Product-ops
   npm install
   ```
4. **Configure environment variables** in `.env`
5. **Start with PM2** (recommended for production):
   ```bash
   npm install -g pm2
   pm2 start src/runScheduler.js --name "weekly-report-scheduler"
   pm2 startup
   pm2 save
   ```

### Option 2: Docker Deployment

**Best for**: Containerized environments

```bash
# Build the Docker image
docker build -t weekly-report-scheduler .

# Run with environment variables
docker run -d \
  --name weekly-report-scheduler \
  --env-file .env \
  --restart unless-stopped \
  weekly-report-scheduler
```

### Option 3: Heroku

**Best for**: Quick cloud deployment

1. **Create Procfile** (already created by deploy script):
   ```
   worker: npm run scheduler
   ```

2. **Deploy to Heroku**:
   ```bash
   heroku create your-app-name
   heroku config:set NODE_ENV=production
   git push heroku main
   ```

3. **Scale the worker dyno**:
   ```bash
   heroku ps:scale worker=1
   ```

### Option 4: Google Cloud Run

**Best for**: Serverless deployment

```bash
# Deploy to Cloud Run
gcloud run deploy weekly-report-scheduler \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Option 5: AWS Lambda + EventBridge

**Best for**: Serverless with precise scheduling

1. **Create Lambda function** with your code
2. **Set up EventBridge rule** for Monday 6:00 AM EST
3. **Configure environment variables** in Lambda

### Option 6: System Cron (Alternative)

**Best for**: Simple server setups

```bash
# Add to crontab (crontab -e)
0 6 * * 1 cd /path/to/Product-ops && npm start > /var/log/weekly-report.log 2>&1
```

## 🔧 Configuration

### Environment Variables Required

Make sure your `.env` file contains:

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
NODE_ENV=production
```

### Schedule Configuration

The scheduler runs every Monday at 6:00 AM EST (11:00 AM UTC). To change this:

1. **Edit** `src/scheduler.js`
2. **Modify** the cron expression:
   ```javascript
   // Current: Every Monday at 6:00 AM EST
   this.scheduledJob = cron.schedule('0 11 * * 1', async () => {
   ```

## 📊 Monitoring

### Health Checks

The scheduler includes built-in health monitoring:

- **Uptime tracking**
- **Memory usage monitoring**
- **Scheduler status**
- **Hourly status logs**

### Logs

Logs are written to:
- **Console output**
- **Log files** in `logs/` directory
- **Structured JSON format** for easy parsing

### Manual Testing

Test the scheduler anytime:

```bash
# Test report generation
npm run scheduler:test

# Check status
npm start status
```

## 🛡️ Security & Best Practices

### 1. API Key Security
- Store all API keys in environment variables
- Never commit `.env` files to version control
- Use different API keys for different environments

### 2. Server Security
- Use HTTPS for all API communications
- Implement proper firewall rules
- Keep Node.js and dependencies updated

### 3. Monitoring
- Set up log rotation
- Monitor disk space usage
- Set up alerts for failures

### 4. Backup
- Regularly backup your configuration
- Test recovery procedures
- Keep multiple deployment options ready

## 🔍 Troubleshooting

### Common Issues

1. **Scheduler not starting**
   ```bash
   # Check environment variables
   npm run scheduler:test
   
   # Check logs
   tail -f logs/app.log
   ```

2. **Reports not generating**
   ```bash
   # Test manually
   npm start
   
   # Check API connections
   npm run scheduler:test
   ```

3. **Timezone issues**
   - Scheduler uses UTC internally
   - 6:00 AM EST = 11:00 AM UTC (standard time)
   - 6:00 AM EDT = 10:00 AM UTC (daylight time)

### Getting Help

1. **Check logs** in `logs/` directory
2. **Test manually** with `npm run scheduler:test`
3. **Verify API permissions** for Jira and Notion
4. **Check environment variables** are set correctly

## 📈 Scaling Considerations

### For High Volume

If you have many teams or high Jira activity:

1. **Increase memory limits** for the Node.js process
2. **Implement rate limiting** for API calls
3. **Add retry logic** for failed API calls
4. **Consider database storage** for historical data

### For Multiple Environments

1. **Use different API keys** for dev/staging/prod
2. **Separate Notion databases** per environment
3. **Environment-specific logging** levels
4. **Different schedules** for testing

## 🎉 Success!

Once deployed, your weekly reports will be automatically generated every Monday at 6:00 AM EST and posted to your Notion database. The scheduler will:

- ✅ Run continuously until stopped
- ✅ Generate reports for the previous week
- ✅ Log all activities and errors
- ✅ Handle failures gracefully
- ✅ Provide health monitoring

Your team will have fresh weekly reports waiting for them every Monday morning! 🚀
