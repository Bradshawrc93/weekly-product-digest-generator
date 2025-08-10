# Weekly Product Digest Generator – Order of Operations

This document details the current implementation and operational flow of the Weekly Product Digest Generator tool.

## 0. Inputs & Config

### 0.1 Environment Configuration
- **Slack Configuration**
  - `SLACK_BOT_TOKEN` - Bot user OAuth token for API access
  - `SLACK_SIGNING_SECRET` - App signing secret for verification
- **Jira Configuration**
  - `JIRA_BASE_URL` - Your Jira instance URL
  - `JIRA_EMAIL` - Email for Jira API authentication
  - `JIRA_API_TOKEN` - API token for Jira access
- **Notion Configuration**
  - `NOTION_API_KEY` - Integration API key
  - `NOTION_DATABASE_ID` - Target database for digest pages
- **Git Configuration**
  - `GITHUB_TOKEN` - Personal access token or GitHub App token
  - `GITHUB_ORG` - Organization name for repository access
- **AI Configuration**
  - `OPENAI_API_KEY` - OpenAI API key for summarization

### 0.2 Squad Configuration (`config/squads.json`)
```json
{
  "squads": [
    {
      "name": "Platform Squad",
      "members": [
        {
          "fullName": "John Doe",
          "slackHandle": "@johndoe",
          "githubUsername": "johndoe"
        }
      ],
      "jiraProjectKeys": ["PLAT"],
      "slackChannel": "#platform-squad",
      "notionRoadmapUrl": "https://notion.so/your-roadmap",
      "githubRepos": ["platform-api", "platform-ui"]
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
    },
    "jiraCustomFields": {
      "targetQuarter": "customfield_10001",
      "confidence": "customfield_10002"
    }
  }
}
```

### 0.3 Runtime Configuration
- **Run Window**: Configurable time window (default: Monday 00:00 → Sunday 23:59)
- **Jira Custom Fields**: Configurable field mappings for Target Quarter, Confidence %
- **Output Database**: Notion database ID for digest pages

---

## 1. Data Ingestion

### 1.1 Jira Data Collection (`src/ingestors/jira.js`)

**Query Parameters:**
- Project keys from squad configuration
- Updated date range within run window
- Issue types: Epic, Story, Task, Bug
- Status changes and field updates

**Extracted Data:**
```javascript
{
  key: "PLAT-123",
  title: "Implement user authentication",
  type: "Story",
  status: "In Progress",
  storyPoints: { total: 8, done: 5 },
  targetQuarter: "Q1 2024",
  dueDate: "2024-01-15",
  assignee: "john.doe@company.com",
  epicKey: "PLAT-100",
  linkedPRs: ["#123", "#124"],
  lastUpdated: "2024-01-10T14:30:00Z",
  riskFactors: ["no_movement_14_days", "overdue"]
}
```

**Risk Detection Logic:**
- No movement in 14+ days → `no_movement_14_days`
- Overdue due date → `overdue`
- Scope creep (story points increased) → `scope_creep`
- High confidence drop → `confidence_drop`

### 1.2 Git/PR Data Collection (`src/ingestors/github.js`)

**Search Criteria:**
- Merged PRs in date range
- Updated PRs in date range
- Repository allowlist from squad config

**Extracted Data:**
```javascript
{
  number: 123,
  title: "Add user authentication feature",
  author: "johndoe",
  mergedAt: "2024-01-10T10:00:00Z",
  linkedIssues: ["PLAT-123", "PLAT-124"],
  labels: ["breaking-change", "security"],
  repository: "platform-api",
  branchName: "feature/PLAT-123-user-auth"
}
```

**Issue Linking:**
- Extract Jira keys from branch names: `feature/PLAT-123-user-auth`
- Extract Jira keys from PR titles: "Add user authentication [PLAT-123]"
- Extract Jira keys from PR body: "Fixes PLAT-123"

### 1.3 Slack Data Collection (`src/ingestors/slack.js`)

**Channel Processing:**
- Squad-specific channels (if configured)
- Shared channels with member mention filtering

**Message Processing:**
```javascript
{
  channel: "#product",
  timestamp: "1641823200.123456",
  author: "U123456",
  text: "We decided to postpone the auth rollout",
  threadTs: "1641823200.123456",
  mentions: ["@johndoe", "@janedoe"],
  classification: "decision",
  permalink: "https://company.slack.com/archives/C123/p1641823200123456"
}
```

**Classification Logic:**
- Keywords: "decided", "decision", "agreed" → `decision`
- Keywords: "blocked", "blocker", "stuck" → `blocker`
- Keywords: "launch", "deploy", "release" → `launch`
- Keywords: "risk", "concern", "issue" → `risk`

**Noise Filtering:**
- Remove bot messages
- Remove pure emoji reactions
- Remove trivial acknowledgments ("👍", "thanks", etc.)
- Group related threads by topic

---

## 2. Data Processing

### 2.1 Cross-Linking (`src/processors/crossLinker.js`)

**PR to Jira Linking:**
- Direct key extraction from branch names and PR content
- Confidence scoring based on match quality
- Manual review queue for ambiguous matches

**Slack to Squad Linking:**
- Direct channel matches for squad-specific channels
- Member mention detection in shared channels
- Topic relevance scoring

**Epic Hierarchy:**
- Build epic → story → task hierarchy
- Calculate epic-level metrics
- Track epic progress and risks

### 2.2 Insights Derivation (`src/processors/insights.js`)

**Velocity Pulse:**
```javascript
{
  plannedPoints: 40,
  completedPoints: 32,
  velocity: 0.8,
  trend: "increasing",
  comparison: "last_week"
}
```

**Risk Radar:**
```javascript
{
  highRiskEpics: ["PLAT-100", "PLAT-101"],
  riskFactors: {
    "PLAT-100": ["overdue", "no_movement_14_days"],
    "PLAT-101": ["scope_creep"]
  },
  riskScore: 0.7
}
```

**Quarter Snapshot:**
```javascript
{
  "Q1 2024": {
    epicCount: 5,
    totalPoints: 120,
    completedPoints: 80,
    completionRate: 0.67
  },
  "Q2 2024": {
    epicCount: 3,
    totalPoints: 60,
    completedPoints: 0,
    completionRate: 0.0
  }
}
```

**Decision Tracking:**
```javascript
{
  decisions: [
    {
      text: "Postpone auth rollout to Q2",
      owner: "@johndoe",
      date: "2024-01-10",
      permalink: "https://slack.com/...",
      impact: "high"
    }
  ]
}
```

---

## 3. Summarization

### 3.1 AI Prompt Construction (`src/generators/promptBuilder.js`)

**Input Context:**
- Squad name and members
- Link to Notion roadmap/vision doc
- Current week's data summary
- Historical context (last 2 weeks)

**Prompt Structure:**
```
You are generating a weekly product digest for the [Squad Name] team.

Context:
- Squad members: [list]
- Roadmap: [link]
- Week: [start_date] to [end_date]

Data Summary:
- Jira movements: [key changes]
- Notable PRs: [merged/updated]
- Slack decisions: [key decisions]
- Risks identified: [risk factors]

Generate a structured digest with:
1. TL;DR (max 5 bullets)
2. What Shipped
3. Work in Flight
4. Risks & Blockers
5. Decisions
6. Roadmap Snapshot

Tone: Professional, data-driven, actionable
```

### 3.2 AI Output Processing (`src/generators/aiProcessor.js`)

**Response Parsing:**
- Extract structured sections
- Validate required content
- Format for Notion blocks
- Add metadata and links

**Quality Checks:**
- Minimum content length per section
- Required data points included
- Proper formatting and links
- Sensitive data redaction

---

## 4. Output Generation

### 4.1 Notion Page Creation (`src/publishers/notion.js`)

**Page Structure:**
```javascript
{
  title: "WEEK of 2024-01-08 — Platform Squad",
  properties: {
    "Squad": "Platform Squad",
    "Week Start": "2024-01-08",
    "Week End": "2024-01-14",
    "Velocity": 0.8,
    "Shipped Count": 5,
    "Risk Count": 2
  },
  content: [
    {
      type: "heading_1",
      text: "TL;DR"
    },
    {
      type: "bulleted_list_item",
      text: "Shipped user authentication feature"
    },
    // ... more content blocks
  ]
}
```

**Content Blocks:**
- Headings for each section
- Bulleted lists for summaries
- Rich text with links to Jira/PRs
- Callout blocks for risks and decisions
- Database views for roadmap snapshots

### 4.2 Executive Roll-Up (`src/publishers/execRollup.js`)

**Cross-Squad Analysis:**
- Dependencies between squads
- Shared risks and blockers
- Company-wide velocity trends
- Strategic alignment check

**Roll-Up Page:**
- Links to all squad pages
- Executive summary
- Cross-squad highlights
- Risk escalation items

---

## 5. Publishing & Notifications

### 5.1 Notion Publishing (`src/publishers/notion.js`)

**Database Operations:**
- Create squad pages in target database
- Update existing pages if re-running
- Set proper properties and relations
- Handle rate limits and retries

**Error Handling:**
- Retry failed operations
- Log errors with context
- Fallback to simplified format
- Alert on critical failures

### 5.2 Slack Notifications (`src/publishers/slack.js`)

**Notification Content:**
```
📊 Weekly Digest Generated

Platform Squad: https://notion.so/page-123
Mobile Squad: https://notion.so/page-124
Data Squad: https://notion.so/page-125

Executive Summary: https://notion.so/rollup-456

Key Highlights:
• 3 features shipped this week
• 2 risks identified and escalated
• Velocity trending upward
```

**Channel Targeting:**
- Post to `#product` channel
- Tag relevant squad members
- Include permalinks to Notion pages
- Add reaction emojis for quick feedback

---

## 6. Scheduling & Reruns

### 6.1 Automated Scheduling (`src/scheduler/index.js`)

**Cron Configuration:**
```javascript
// Every Monday at 7:30 AM CT
"0 30 13 * * 1"
```

**Scheduling Logic:**
- Check if it's a holiday/weekend
- Validate all configurations
- Run with error handling
- Send success/failure notifications

### 6.2 Manual Triggers (`src/commands/slackCommands.js`)

**Slash Commands:**
- `/digest now` - Run immediately
- `/digest squad <name>` - Run for specific squad
- `/digest date <YYYY-MM-DD>` - Run for specific week
- `/digest status` - Check last run status

**Command Processing:**
- Validate user permissions
- Parse command parameters
- Queue job for execution
- Provide immediate feedback

---

## 7. Guardrails & Security

### 7.1 Access Control

**Channel Allowlist:**
- Only process configured channels
- Validate channel permissions
- Log access attempts

**Repository Allowlist:**
- Only scan configured repos
- Validate repository access
- Rate limit API calls

### 7.2 Data Protection

**Sensitive Data Redaction:**
- API keys and tokens
- Internal URLs and IPs
- Personal information
- Confidential discussions

**Jira Exclusion:**
- `no-digest` label exclusion
- Private issue filtering
- Permission-based access

### 7.3 Rate Limiting

**API Limits:**
- Slack: 50 requests/second
- Jira: 1000 requests/hour
- GitHub: 5000 requests/hour
- Notion: 3 requests/second

**Retry Logic:**
- Exponential backoff
- Maximum retry attempts
- Circuit breaker pattern
- Graceful degradation

---

## 8. Monitoring & Observability

### 8.1 Logging (`src/utils/logger.js`)

**Log Levels:**
- `DEBUG` - Detailed execution flow
- `INFO` - General operations
- `WARN` - Non-critical issues
- `ERROR` - Failures and exceptions

**Log Structure:**
```javascript
{
  timestamp: "2024-01-10T14:30:00Z",
  level: "INFO",
  message: "Processing squad: Platform Squad",
  squad: "Platform Squad",
  operation: "data_ingestion",
  duration: 1500,
  metadata: { /* additional context */ }
}
```

### 8.2 Metrics (`src/utils/metrics.js`)

**Key Metrics:**
- Processing time per squad
- API call success rates
- Data quality scores
- Error rates by component

**Alerting:**
- Processing failures
- API rate limit hits
- Data quality degradation
- Security violations

---

## 9. Testing & Quality Assurance

### 9.1 Test Coverage

**Unit Tests:**
- Individual component testing
- Mock external APIs
- Edge case handling
- Error condition testing

**Integration Tests:**
- End-to-end workflow testing
- API integration validation
- Configuration testing
- Performance benchmarking

### 9.2 Data Validation

**Input Validation:**
- Configuration file validation
- API response validation
- Data format verification
- Required field checking

**Output Validation:**
- Notion page structure
- Content quality checks
- Link validation
- Format consistency

---

## 10. Deployment & Operations

### 10.1 Environment Setup

**Production Environment:**
- Node.js 18+ runtime
- Environment variable configuration
- Log rotation and retention
- Monitoring and alerting

**Development Environment:**
- Local configuration overrides
- Mock API responses
- Debug logging enabled
- Hot reloading for development

### 10.2 Maintenance

**Regular Tasks:**
- API token rotation
- Configuration updates
- Log cleanup
- Performance monitoring

**Emergency Procedures:**
- Incident response playbook
- Rollback procedures
- Data recovery processes
- Communication protocols

---

*This document is maintained alongside the codebase and reflects the current state of the tool's implementation. For questions or updates, please contact the development team.*
