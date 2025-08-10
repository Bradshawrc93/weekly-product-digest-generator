# Weekly Product Digest Generator

A comprehensive tool for generating weekly product operations digests by aggregating data from Jira, Git/PRs, and Slack to provide insights into squad velocity, risks, and decisions.

## Overview

This tool automates the creation of weekly product digests by:
- Collecting data from multiple sources (Jira, Git, Slack)
- Processing and cross-linking information
- Generating AI-powered summaries
- Publishing to Notion with structured outputs

## Features

- **Multi-source data ingestion** from Jira, Git repositories, and Slack
- **Intelligent cross-linking** between issues, PRs, and discussions
- **AI-powered summarization** with structured outputs
- **Automated publishing** to Notion databases
- **Risk detection** and velocity tracking
- **Squad-specific insights** with executive roll-ups

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

# Git Configuration
GITHUB_TOKEN=your-github-token
GITHUB_ORG=your-organization

# AI Configuration (OpenAI)
OPENAI_API_KEY=your-openai-api-key
```

### Squad Configuration

Configure your squads in `config/squads.json`:

```json
{
  "squads": [
    {
      "name": "Platform Squad",
      "members": [
        {
          "fullName": "John Doe",
          "slackHandle": "@johndoe"
        }
      ],
      "jiraProjectKeys": ["PLAT"],
      "slackChannel": "#platform-squad",
      "notionRoadmapUrl": "https://notion.so/your-roadmap"
    }
  ],
  "globalSettings": {
    "sharedSlackChannels": ["#product", "#engineering"],
    "outputNotionDatabaseId": "your-database-id",
    "runWindow": {
      "startDay": "monday",
      "startTime": "00:00",
      "endDay": "sunday", 
      "endTime": "23:59"
    }
  }
}
```

## Architecture

### Data Flow

1. **Data Ingestion** - Collect data from Jira, Git, and Slack
2. **Processing** - Cross-link and analyze data
3. **Summarization** - Generate AI-powered insights
4. **Output** - Create Notion pages and send notifications

### Key Components

- `src/ingestors/` - Data collection modules
- `src/processors/` - Data processing and analysis
- `src/generators/` - AI summarization and output generation
- `src/publishers/` - Notion publishing and notifications
- `src/utils/` - Shared utilities and helpers

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
npm run digest -- --squad "Platform Squad"
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

### Executive Roll-Up

A summary page linking to all squad pages with cross-squad highlights and dependencies.

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to Jira, Slack, GitHub, and Notion APIs

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

**Note**: This is a living document that will be updated as the tool evolves. For the most current information about how the tool operates, see `OPERATIONS.md`.
