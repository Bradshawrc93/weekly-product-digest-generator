# Team Summary by Changes/Updates/New Items

## Overview

The Team Summary functionality provides a comprehensive breakdown of changes, updates, and new items organized by team. This feature automatically groups Jira issues by team and analyzes their activity patterns, change types, and progress over time.

## Key Features

### 🏢 **Team-Based Grouping**
- Automatically groups issues by team field (`customfield_10001`)
- Handles multiple teams in a single analysis
- Provides team-specific insights and metrics
- Supports 9 configured teams with proper UUID mapping

### 📊 **Comprehensive Analytics**
- **Total Issues**: Count of all issues per team
- **Issues with Changes**: Issues that had activity in the date range
- **New Items**: Issues created within the date range
- **Total Changes**: Sum of all field changes across the team
- **Change Rate**: Percentage of issues with changes

### 🔄 **Change Type Categorization**
- **Status Changes**: Workflow progression
- **Assignee Changes**: Task reassignments
- **Story Point Changes**: Effort estimation updates
- **Priority Changes**: Importance level adjustments
- **Target Quarter Changes**: Timeline modifications
- **Epic Link Changes**: Epic reassignments
- **Comments**: Activity and communication
- **Other Changes**: Miscellaneous field updates

### 📈 **Activity Level Assessment**
- **No Activity**: 0 changes
- **Low Activity**: 1-5 changes
- **Moderate Activity**: 6-15 changes
- **High Activity**: 16-30 changes
- **Very High Activity**: 30+ changes

## Configured Teams

The system is configured with 9 teams:

1. **Customer-Facing (Empower/SmarterAccess UI)** - `eab6f557-2ee3-458c-9511-54c135cd4752-88`
2. **Human in the loop (HITL)** - `eab6f557-2ee3-458c-9511-54c135cd4752-86`
3. **Developer Efficiency** - `eab6f557-2ee3-458c-9511-54c135cd4752-87`
4. **Data Collection / Data Lakehouse** - `eab6f557-2ee3-458c-9511-54c135cd4752-85`
5. **ThoughtHub Platform** - `eab6f557-2ee3-458c-9511-54c135cd4752-84`
6. **Core RCM** - `eab6f557-2ee3-458c-9511-54c135cd4752-83`
7. **Voice** - `eab6f557-2ee3-458c-9511-54c135cd4752-82`
8. **Medical Coding** - `eab6f557-2ee3-458c-9511-54c135cd4752-80`
9. **Deep Research** - `eab6f557-2ee3-458c-9511-54c135cd4752-81`

## Implementation

### Core Components

#### 1. TeamSummaryGenerator (`src/utils/teamSummaryGenerator.js`)

**Main Methods**:
```javascript
// Generate team summaries from issues
generateTeamSummary(issues, dateRange)

// Generate human-readable markdown report
generateHumanReadableSummary(teamSummaries, dateRange)

// Generate structured JSON report
generateFormattedReport(teamSummaries, dateRange)
```

#### 2. Integration with DigestGenerator

The team summary is automatically generated as part of the digest process:
```javascript
// In DigestGenerator.processSquad()
const teamSummaries = this.teamSummaryGenerator.generateTeamSummary(jiraData.issues, dateRange);

return {
  squad: squad.name,
  // ... other data
  teamSummaries: teamSummaries,
  digest
};
```

## Recent Fixes and Improvements

### 🔧 **JQL Labels Filter Fix**
**Issue**: The original JQL filter `labels != "no-digest"` was excluding all issues because they had undefined/null labels.

**Solution**: Updated to `(labels IS EMPTY OR labels != "no-digest")` to properly handle issues without labels.

**Files Updated**:
- `src/ingestors/jira.js` - Fixed in all JQL methods (buildIssueJQL, buildWorkstreamJQL, buildEpicJQL)

### 🏷️ **Team Field Structure Handling**
**Issue**: Jira team field contains an object with `id` and `name` properties, not just a simple string.

**Solution**: Updated team processing to handle the object structure:
```javascript
// Before
const team = issue.fields?.customfield_10001;

// After  
const teamField = issue.fields?.customfield_10001;
const team = teamField?.id && this.teamMappings[teamField.id] 
  ? this.teamMappings[teamField.id] 
  : teamField?.name || 'Unknown Team';
```

**Files Updated**:
- `src/utils/teamSummaryGenerator.js` - Updated getTeamName method

### 🎯 **JQL Syntax Optimization**
**Issue**: Team field JQL syntax needed optimization for proper filtering.

**Solution**: Updated to use `"Team" = "uuid"` syntax instead of `"Team[Team]" = "uuid"`.

**Files Updated**:
- `src/ingestors/jira.js` - Updated getTeamFilter method

## Output Formats

### 1. Human-Readable Markdown

```markdown
# Team Summary Report
**Date Range**: 2025-08-04 to 2025-08-11
**Generated**: 2025-08-11 09:11:16

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
- 2 status changes

### Change Breakdown
- **Status Changes**: 2
- **Priority Changes**: 1
- **Other Changes**: 5

### Most Active Issues
1. **PO-116** - PM Peds Workflow Mappings
   - Status: Done
   - Assignee: Jakob McClanahan
   - Changes: 3
2. **PO-115** - Viewable Input & Output objects from each call placed
   - Status: Backlog
   - Assignee: Unassigned
   - Changes: 3
3. **PO-117** - Workflow Creation & Configuration
   - Status: In Progress
   - Assignee: Jakob McClanahan
   - Changes: 2

### Recent Activity
- **PO-117** - Workflow Creation & Configuration
  - Last change: Aug 10, 15:52
  - Changes: 2
- **PO-116** - PM Peds Workflow Mappings
  - Last change: Aug 10, 15:47
  - Changes: 3
- **PO-115** - Viewable Input & Output objects from each call placed
  - Last change: Aug 04, 11:17
  - Changes: 3
```

### 2. Structured JSON Report

```json
{
  "generatedAt": "2025-08-11T14:11:16.855Z",
  "dateRange": {
    "start": "2025-08-04",
    "end": "2025-08-11"
  },
  "totalTeams": 1,
  "teams": {
    "Voice": {
      "overview": {
        "totalIssues": 3,
        "issuesWithChanges": 3,
        "newItems": 3,
        "totalChanges": 8,
        "lastUpdated": "2025-08-10T20:52:00.000Z"
      },
      "changeBreakdown": {
        "statusChanges": 2,
        "assigneeChanges": 0,
        "storyPointChanges": 0,
        "priorityChanges": 1,
        "targetQuarterChanges": 0,
        "epicLinkChanges": 0,
        "comments": 0,
        "otherChanges": 5
      },
      "mostActiveIssues": [
        {
          "key": "PO-116",
          "title": "PM Peds Workflow Mappings",
          "changeCount": 3,
          "status": "Done",
          "assignee": "Jakob McClanahan"
        }
      ],
      "insights": [
        "Low activity level - minimal changes detected",
        "3 new items created",
        "1 items currently in progress",
        "1 items completed",
        "2 status changes"
      ]
    }
  }
}
```

## Usage Examples

### Basic Team Summary Generation

```javascript
const { TeamSummaryGenerator } = require('./src/utils/teamSummaryGenerator');
const moment = require('moment');

const teamSummaryGenerator = new TeamSummaryGenerator();
const dateRange = { 
  startDate: moment().subtract(7, 'days'), 
  endDate: moment() 
};

// Generate team summaries
const teamSummaries = teamSummaryGenerator.generateTeamSummary(issues, dateRange);

// Generate human-readable report
const markdownReport = teamSummaryGenerator.generateHumanReadableSummary(teamSummaries, dateRange);

// Generate structured report
const jsonReport = teamSummaryGenerator.generateFormattedReport(teamSummaries, dateRange);
```

### Integration with DigestGenerator

```javascript
const { DigestGenerator } = require('./src/core/DigestGenerator');

const digestGenerator = new DigestGenerator();
await digestGenerator.initialize();

const result = await digestGenerator.processSquad(squad, dateRange);

// Access team summaries
console.log(`Teams: ${Object.keys(result.teamSummaries).join(', ')}`);
console.log(`Total changes: ${Object.values(result.teamSummaries).reduce((sum, team) => sum + team.totalChanges, 0)}`);
```

## Testing

### Test Scripts

1. **`scripts/test-team-summary.js`**: Basic team summary functionality
2. **`scripts/test-complete-team-summary.js`**: Complete integration test
3. **`scripts/test-real-team-summary.js`**: Real Jira data integration test
4. **`scripts/test-voice-team.js`**: Voice team specific testing
5. **`scripts/debug-jql-generation.js`**: JQL generation debugging
6. **`scripts/test-fixed-jql.js`**: Fixed JQL verification

### Running Tests

```bash
# Test basic functionality
node scripts/test-team-summary.js

# Test complete integration
node scripts/test-complete-team-summary.js

# Test with real Jira data
node scripts/test-real-team-summary.js

# Test specific team
node scripts/test-voice-team.js
```

## Benefits

### 1. **Team Performance Visibility**
- Track team activity levels
- Identify most active teams
- Monitor change patterns

### 2. **Progress Tracking**
- New item creation rates
- Status progression patterns
- Completion rates by team

### 3. **Resource Allocation**
- Identify teams with high activity
- Track assignee changes
- Monitor workload distribution

### 4. **Communication**
- Generate team-specific reports
- Share insights with stakeholders
- Provide context for weekly summaries

### 5. **Process Improvement**
- Identify bottlenecks
- Track change frequency
- Monitor team efficiency

## Configuration

### Customizable Fields

The system tracks these field types by default:
- Status changes
- Assignee changes
- Story point updates
- Priority changes
- Target quarter changes
- Epic link changes
- Comments and activity

### Team Field Configuration

The system uses `customfield_10001` as the team field with proper object structure handling:
```javascript
// Team field structure in Jira
{
  "id": "eab6f557-2ee3-458c-9511-54c135cd4752-82",
  "name": "Voice",
  "avatarUrl": "",
  "isVisible": true,
  "isVerified": false,
  "title": "Voice",
  "isShared": true
}
```

### JQL Configuration

The system generates optimized JQL queries:
```sql
project = PO 
AND updated >= "2025-08-04" 
AND updated <= "2025-08-11" 
AND issuetype IN (Story, Task, Bug, Sub-task) 
AND "Team" = "eab6f557-2ee3-458c-9511-54c135cd4752-82" 
AND (labels IS EMPTY OR labels != "no-digest") 
ORDER BY updated DESC
```

## Future Enhancements

1. **Team Comparison**: Compare activity levels between teams
2. **Trend Analysis**: Track team performance over time
3. **Automated Alerts**: Notify when teams have unusual activity
4. **Dashboard Integration**: Real-time team activity dashboard
5. **Custom Metrics**: Allow teams to define their own KPIs
6. **Cross-team Dependencies**: Track issues that span multiple teams

## Maintenance

### Data Storage
- Team summaries are generated on-demand
- No persistent storage required
- Results can be cached for performance

### Performance Considerations
- Processes only issues with changes
- Efficient changelog analysis
- Minimal memory footprint
- Optimized JQL queries for faster retrieval

### Troubleshooting

**Common Issues**:
1. **No issues found**: Check date range and team UUIDs
2. **JQL errors**: Verify field names and syntax
3. **Team mapping issues**: Ensure UUIDs match Jira configuration

**Debug Commands**:
```bash
# Test JQL generation
node scripts/debug-jql-generation.js

# Test specific team
node scripts/test-voice-team.js

# Test without filters
node scripts/test-without-labels.js
```

This team summary functionality provides comprehensive insights into team activity, enabling better project management, resource allocation, and communication across your organization.
