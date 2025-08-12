# Weekly Jira Report Generator

A powerful tool that automatically generates comprehensive weekly reports from Jira data and publishes them to Notion with beautiful formatting and squad-based metrics.

## 🚀 Features

- **📊 Weekly Metrics Table**: Visual table showing Done, Updated, Created, Stale, and In-Progress counts for all 10 squads
- **🚢 What Shipped**: List of completed tickets grouped by squad with direct Jira links
- **📝 Change Log**: Detailed history of all ticket changes and activities per squad
- **⚠️ Stale Tickets**: Identification of tickets needing attention (no updates in 5+ days)
- **🎯 On Deck**: Backlog tickets organized by priority per squad
- **🤖 AI TL;DR**: Placeholder for future AI-powered summaries
- **📈 Historical Data**: Automatic tracking and storage of weekly metrics for trend analysis
- **🎨 Beautiful Notion Output**: Rich formatting with tables, links, and visual elements

## 📋 Requirements

- Node.js 18+
- Jira API access
- Notion API access
- 10 configured squads with Jira Team UUIDs

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Product-ops
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Configure squads**
   - Edit `config/squads.json` with your squad information
   - Ensure all 10 squads have correct Jira Team UUIDs

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Jira Configuration
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token

# Notion Configuration
NOTION_API_KEY=secret_your-notion-api-key
NOTION_DATABASE_ID=your-notion-database-id

# Optional Configuration
NODE_ENV=development
LOG_LEVEL=info
```

### Squad Configuration (config/squads.json)

```json
{
  "squads": [
    {
      "name": "Customer-Facing",
      "displayName": "Customer-Facing (Empower/SmarterAccess UI)",
      "jiraUuid": "eab6f557-2ee3-458c-9511-54c135cd4752-88",
      "description": "Customer-facing UI and user experience"
    }
    // ... all 10 squads
  ],
  "statusCategories": {
    "backlog": ["Backlog", "Open"],
    "todo": ["To Do", "Ready", "Ready for Development"],
    "inProgress": ["In Progress", "Development", "Review", "Testing"],
    "done": ["Done", "Closed", "Resolved", "Complete"]
  }
}
```

## 🎯 Usage

### Command Line Interface

```bash
# Generate previous week report (default)
npm start

# Generate current week report
npm start current

# Generate previous week report
npm start previous

# Generate custom date range report
npm start custom 2024-01-01 2024-01-07

# Check report status
npm start status
```

### Programmatic Usage

```javascript
const WeeklyReportGenerator = require('./src/index');

const generator = new WeeklyReportGenerator();

// Generate previous week report
const result = await generator.generatePreviousWeekReport();
console.log('Report generated:', result.pageId);

// Generate custom date range
const result = await generator.generateCustomReport('2024-01-01', '2024-01-07');
```

## 📊 Output Structure

### Notion Page Layout

1. **🤖 AI TL;DR** - Placeholder for future AI summaries
2. **📊 Weekly Metrics Table** - 10 columns × 5 rows with squad metrics
3. **🚢 What Shipped** - Completed tickets grouped by squad
4. **📝 Change Log** - History log events per ticket per squad
5. **⚠️ Stale - Needs Review** - In-progress tickets with no updates in 5+ days
6. **🎯 On Deck** - Backlog tickets organized by priority per squad

### Data Files Generated

- `data/weekly-metrics-YYYY-MM-DD.json` - Weekly metrics per squad
- `data/weekly-details-YYYY-MM-DD.json` - Detailed ticket data
- `data/historical-metrics.json` - Rolling historical data
- `logs/` - Execution logs and errors

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📁 Project Structure

```
src/
├── connectors/
│   ├── jira.js              # Jira API client and data fetching
│   └── notion.js            # Notion API client and page creation
├── processors/
│   ├── metricsCalculator.js # Calculate weekly metrics
│   └── dataOrganizer.js     # Organize tickets by type
├── generators/
│   └── notionPageGenerator.js # Generate Notion page content
├── utils/
│   ├── config.js            # Load environment and squad config
│   ├── logger.js            # Logging and error handling
│   ├── dateUtils.js         # Date range calculations
│   └── dataStorage.js       # Save/load data files
└── index.js                 # Main orchestration
```

## 🔧 Development

### Adding New Features

1. **New Metrics**: Add to `metricsCalculator.js`
2. **New Data Types**: Add to `dataOrganizer.js`
3. **New Notion Sections**: Add to `notionPageGenerator.js`
4. **New API Integrations**: Add to `connectors/` directory

### Code Style

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📈 Metrics Tracked

### Per Squad
- **Done**: Tickets moved to Done status in last 7 days
- **Updated**: Tickets with any activity in last 7 days
- **Created**: New tickets created in last 7 days
- **Stale**: In-progress tickets with no updates in 5+ days
- **In-Progress**: Current count of tickets in progress

### Historical Data
- Weekly metrics stored for trend analysis
- Automatic cleanup of old data (keeps last 12 weeks)
- Historical data preserved for 52 weeks

## 🚨 Error Handling

- Comprehensive logging with Winston
- Graceful API failure handling
- Data validation and integrity checks
- Automatic retry logic for transient failures

## 🔒 Security

- API keys stored in environment variables
- No sensitive data in logs
- Secure API authentication
- Data access controls respected

## 📝 Logging

Logs are written to:
- `logs/error.log` - Error-level messages
- `logs/combined.log` - All log messages
- Console output in development

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the logs in `logs/` directory
2. Verify your configuration in `.env` and `config/squads.json`
3. Run tests to verify setup: `npm test`
4. Open an issue on GitHub

## 🎉 Success Criteria

- ✅ **Data Accuracy**: 99%+ accuracy in data collection
- ✅ **Report Quality**: High-quality, actionable reports
- ✅ **Integration Reliability**: 99.9% uptime for integrations
- ✅ **Time Savings**: 80%+ reduction in manual reporting time
- ✅ **Visual Appeal**: Beautiful, professional Notion output

---

**Built with ❤️ for efficient product operations**
