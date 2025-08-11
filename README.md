# Weekly Product Digest Generator

A comprehensive tool for generating weekly product operations digests by aggregating data from Jira, Git/PRs, and Slack to provide insights into squad velocity, risks, and decisions.

## Overview

This tool automates the creation of weekly product digests by:
- Collecting data from multiple sources (Jira, Git, Slack)
- Processing and cross-linking information
- Generating AI-powered summaries
- Publishing to Notion with structured outputs
- **NEW**: Team-based activity analysis and change tracking

## Features

- **Multi-source data ingestion** from Jira, Git repositories, and Slack
- **Intelligent cross-linking** between issues, PRs, and discussions
- **AI-powered summarization** with structured outputs
- **Automated publishing** to Notion databases
- **Risk detection** and velocity tracking
- **Squad-specific insights** with executive roll-ups
- **🆕 Team Summary Analysis** - Comprehensive team activity breakdown by changes, updates, and new items
- **🆕 Incremental Sync** - Efficient data collection with change tracking
- **🆕 9 Configured Teams** - Support for Customer-Facing, HITL, Developer Efficiency, Data Collection, ThoughtHub Platform, Core RCM, Voice, Medical Coding, and Deep Research teams

## Quick Start

1. Clone this repository
2. Copy `.env.example` to `.env` and configure your API keys
3. Install dependencies: `npm install`
4. Configure your squad settings in `config/squads.json`
5. Run the digest generator: `npm run digest`

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# Jira Configuration
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token

# Notion Configuration
NOTION_API_KEY=secret-your-notion-api-key
NOTION_DATABASE_ID=your-database-id

# Git Configuration (Currently disabled)
# GITHUB_TOKEN=your-github-token
# GITHUB_ORG=your-organization

# AI Configuration (OpenAI)
OPENAI_API_KEY=your-openai-api-key
```

### Squad Configuration

Configure your squads in `config/squads.json`:

```json
{
  "squads": [
    {
      "name": "Voice",
      "description": "Voice technology and speech processing",
      "members": [
        {
          "fullName": "David Lee",
          "slackHandle": "@davidl",
          "githubUsername": "davidlee",
          "email": "david.lee@company.com",
          "role": "Voice Lead"
        }
      ],
      "jiraConfig": {
        "projectKey": "PO",
        "projectName": "Product Operations",
        "workstreams": [
          {
            "name": "Voice Technology",
            "key": "VOICE-TECH",
            "description": "Voice recognition and processing technology"
          }
        ]
      },
      "slackChannel": "#product",
      "notionRoadmapUrl": "https://notion.so/your-voice-roadmap",
      "githubRepos": [],
      "bitbucketRepos": [],
      "tags": ["voice", "speech", "recognition", "processing"]
    }
  ],
  "globalSettings": {
    "sharedSlackChannels": ["#product"],
    "outputNotionDatabaseId": "your-database-id",
    "runWindow": {
      "startDay": "monday",
      "startTime": "00:00",
      "endDay": "sunday", 
      "endTime": "23:59"
    },
    "jiraCustomFields": {
      "epicLink": "customfield_10014",
      "targetQuarter": "customfield_10368",
      "team": "customfield_10001",
      "storyPoints": "customfield_10030"
    }
  }
}
```

## Architecture

### Data Flow

1. **Data Ingestion** - Collect data from Jira, Git, and Slack
2. **Processing** - Cross-link and analyze data
3. **Team Analysis** - Generate team-specific summaries and change tracking
4. **Summarization** - Generate AI-powered insights
5. **Output** - Create Notion pages and send notifications

### Key Components

- `src/ingestors/` - Data collection modules (Jira, Slack, Git)
- `src/processors/` - Data processing and analysis
- `src/generators/` - AI summarization and output generation
- `src/publishers/` - Notion publishing and notifications
- `src/utils/` - Shared utilities and helpers
- `src/core/` - Core orchestration and team summary generation

## Recent Updates

### ✅ **Team Summary Feature** (Latest)
- **Comprehensive team analysis** with change tracking
- **9 configured teams** with proper UUID mapping
- **Activity level assessment** (No/Low/Moderate/High/Very High)
- **Change type categorization** (Status, Assignee, Priority, etc.)
- **Human-readable reports** in markdown format
- **Structured JSON output** for programmatic access

### ✅ **Jira Integration Fixes**
- **Fixed labels filter** - Now properly handles undefined/null labels
- **Optimized JQL queries** - Faster and more reliable data retrieval
- **Team field structure** - Proper handling of Jira's team object format
- **Incremental sync** - Only fetch data updated since last run

### ✅ **Configuration Updates**
- **Updated squad structure** - New `jiraConfig` format with workstreams
- **Team UUID mapping** - Proper mapping between squad names and Jira UUIDs
- **Custom field configuration** - Support for team, story points, target quarter fields

## Usage

### Scheduled Runs

The tool is designed to run automatically every Monday at 7:30 AM CT.

### Manual Runs

```bash
# Generate digest for current week
npm run digest

# Generate digest for specific date range
npm run digest -- --start-date 2024-01-01 --end-date 2024-01-07

# Generate digest for specific squad
npm run digest -- --squad "Voice"
```

### Team Summary Testing

```bash
# Test team summary with real Jira data
node scripts/test-real-team-summary.js

# Test specific team
node scripts/test-voice-team.js

# Test JQL generation
node scripts/debug-jql-generation.js
```

### Slack Commands

- `/digest now` - Generate digest immediately
- `/digest squad <squad-name>` - Generate digest for specific squad

## Output Structure

### Per-Squad Notion Page

Each squad gets a structured Notion page with:

- **TL;DR** - Executive summary (max 5 bullets)
- **What Shipped** - Completed work with PR links
- **Work In Flight** - Active development items
- **Risks & Blockers** - Identified issues and concerns
- **Decisions** - Key decisions from Slack discussions
- **Roadmap Snapshot** - Open epics by target quarter
- **Changelog** - Detailed activity log
- **🆕 Team Summary** - Team activity breakdown and insights

### Team Summary Report

```markdown
# Team Summary Report
**Date Range**: 2025-08-04 to 2025-08-11

## Voice

### Overview
- **Total Issues**: 3
- **Issues with Changes**: 3
- **New Items**: 3
- **Total Changes**: 8

### Key Insights
- Low activity level - minimal changes detected
- 3 new items created
- 1 items currently in progress
- 1 items completed

### Change Breakdown
- **Status Changes**: 2
- **Priority Changes**: 1
- **Other Changes**: 5
```

### Executive Roll-Up

A summary page linking to all squad pages with cross-squad highlights and dependencies.

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to Jira, Slack, and Notion APIs

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

### Testing

```bash
# Test team summary functionality
node scripts/test-team-summary.js

# Test with real Jira data
node scripts/test-real-team-summary.js

# Test specific components
node scripts/test-voice-team.js
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Security

- API keys are stored in environment variables
- Sensitive data is redacted from Slack messages
- Channel and repository access is restricted via allowlists
- Jira issues can be excluded with `no-digest` labels

## Troubleshooting

### Common Issues

1. **API Rate Limits** - The tool includes rate limiting and retry logic
2. **Missing Data** - Check API permissions and configuration
3. **Notion Publishing Errors** - Verify database permissions and structure
4. **JQL Errors** - Verify field names and team UUIDs

### Debug Commands

```bash
# Test JQL generation
node scripts/debug-jql-generation.js

# Test without filters
node scripts/test-without-labels.js

# Test specific team
node scripts/test-voice-team.js
```

### Logs

Logs are written to `logs/` directory with different levels:
- `info.log` - General information
- `error.log` - Errors and warnings
- `debug.log` - Detailed debugging information

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the configuration examples
3. Open an issue on GitHub
4. Contact the development team

---

**Note**: This is a living document that will be updated as the tool evolves. For the most current information about how the tool operates, see `OPERATIONS.md` and `TEAM_SUMMARY.md`.
