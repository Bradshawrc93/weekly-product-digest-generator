# Setup Guide - Weekly Product Digest Generator

This guide will walk you through setting up the Weekly Product Digest Generator for your organization.

## Prerequisites

- Node.js 18+ and npm
- Access to the following services:
  - Slack (with admin permissions for app installation)
  - Jira (with API access)
  - GitHub (with API access)
  - Notion (with API access)
  - OpenAI (with API access)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd weekly-product-digest-generator

# Install dependencies
npm install
```

## Step 2: Environment Configuration

1. Copy the environment template:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` and configure your API keys and tokens:

   ### Slack Configuration
   - Create a Slack app at https://api.slack.com/apps
   - Add bot token scopes: `channels:read`, `channels:history`, `users:read`
   - Install the app to your workspace
   - Copy the Bot User OAuth Token (starts with `xoxb-`)
   - Copy the Signing Secret

   ### Jira Configuration
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Create a new API token
   - Use your email and the API token for authentication

   ### Notion Configuration
   - Go to https://www.notion.so/my-integrations
   - Create a new integration
   - Copy the Internal Integration Token (starts with `secret_`)
   - Create a database for digest pages and copy its ID

   ### GitHub Configuration
   - Go to https://github.com/settings/tokens
   - Create a Personal Access Token with repo scope
   - Or use a GitHub App token if preferred

   ### OpenAI Configuration
   - Go to https://platform.openai.com/api-keys
   - Create a new API key

## Step 3: Squad Configuration

1. Edit `config/squads.json` to configure your squads:

   ```json
   {
     "squads": [
       {
         "name": "Your Squad Name",
         "description": "Squad description",
         "members": [
           {
             "fullName": "John Doe",
             "slackHandle": "@johndoe",
             "githubUsername": "johndoe",
             "email": "john.doe@company.com",
             "role": "Tech Lead"
           }
         ],
         "jiraProjectKeys": ["PROJ"],
         "slackChannel": "#your-squad",
         "notionRoadmapUrl": "https://notion.so/your-roadmap",
         "githubRepos": ["your-repo-name"]
       }
     ],
     "globalSettings": {
       "sharedSlackChannels": ["#product", "#engineering"],
       "outputNotionDatabaseId": "your-notion-database-id",
       "runWindow": {
         "startDay": "monday",
         "startTime": "00:00",
         "endDay": "sunday",
         "endTime": "23:59"
       }
     }
   }
   ```

## Step 4: Validate Configuration

Run the setup script to validate your configuration:

```bash
npm run setup
```

This will:
- Validate environment variables
- Test API connections
- Create necessary directories
- Display configuration summary

## Step 5: Test the Tool

Run a dry-run test to ensure everything works:

```bash
# Test for all squads
npm run digest generate -- --dry-run

# Test for a specific squad
npm run digest generate -- --squad "Your Squad Name" --dry-run

# Test for a specific date range
npm run digest generate -- --start-date 2024-01-01 --end-date 2024-01-07 --dry-run
```

## Step 6: Production Deployment

### Option A: Local Server with Cron

1. Set up a cron job to run weekly:
   ```bash
   # Edit crontab
   crontab -e

   # Add this line to run every Monday at 7:30 AM
   30 7 * * 1 cd /path/to/weekly-product-digest-generator && npm run digest generate
   ```

### Option B: Cloud Deployment

1. Deploy to your preferred cloud platform (AWS, GCP, Azure, etc.)
2. Set up environment variables in your cloud environment
3. Configure scheduled execution using your platform's scheduler

### Option C: Docker Deployment

1. Create a Dockerfile (see example below)
2. Build and run the container
3. Use Docker's cron or external scheduler

## Step 7: Slack Integration (Optional)

To enable Slack slash commands:

1. Add slash command permissions to your Slack app
2. Configure the command endpoint in your deployment
3. Add the command handler to your application

## Step 8: Monitoring and Maintenance

### Logs
- Check logs in the `logs/` directory
- Monitor for errors and API rate limits
- Set up log rotation

### API Limits
- Monitor usage for all APIs
- Implement rate limiting if needed
- Set up alerts for quota exhaustion

### Regular Maintenance
- Rotate API tokens regularly
- Update squad configurations as teams change
- Monitor and update dependencies

## Troubleshooting

### Common Issues

1. **API Connection Failures**
   - Verify API keys and tokens are correct
   - Check network connectivity
   - Ensure proper permissions are granted

2. **Configuration Errors**
   - Run `npm run validate-config` to check configuration
   - Verify JSON syntax in squad configuration
   - Check environment variable formats

3. **Rate Limiting**
   - Implement exponential backoff
   - Reduce concurrent API calls
   - Monitor usage patterns

4. **Data Quality Issues**
   - Verify Jira project keys exist
   - Check GitHub repository access
   - Ensure Slack channels are accessible

### Getting Help

1. Check the logs in `logs/` directory
2. Review the `OPERATIONS.md` file for detailed information
3. Run validation scripts to identify issues
4. Check API documentation for service-specific issues

## Security Considerations

1. **API Key Management**
   - Store keys securely (use environment variables)
   - Rotate keys regularly
   - Use least-privilege access

2. **Data Privacy**
   - Review what data is collected and stored
   - Implement data retention policies
   - Ensure compliance with company policies

3. **Access Control**
   - Limit who can run the tool
   - Audit access to generated reports
   - Monitor for unauthorized usage

## Next Steps

After successful setup:

1. **Customize the Tool**
   - Modify AI prompts for your organization's tone
   - Adjust risk thresholds and metrics
   - Customize Notion page templates

2. **Scale Up**
   - Add more squads as needed
   - Implement additional data sources
   - Create custom insights and metrics

3. **Integrate with Existing Tools**
   - Connect to your existing monitoring systems
   - Integrate with your CI/CD pipeline
   - Add to your existing reporting workflows

For more detailed information, see:
- `README.md` - Project overview and usage
- `OPERATIONS.md` - Detailed operational guide
- `config/squads.json` - Configuration examples
