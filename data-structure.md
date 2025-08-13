# Data Structure - Weekly Jira Report Generator

## Data Capture Requirements

### **Jira Data to Fetch**

#### **Issue Fields**
- `key` - Jira issue key (e.g., "PO-123")
- `summary` - Issue summary/title
- `status` - Current status
- `priority` - Priority level
- `assignee` - Assigned person
- `created` - Creation date
- `updated` - Last update date
- `team` - Jira Team field (UUID)
- `project` - Project key

#### **Changelog Fields**
- `author` - Who made the change
- `field` - What field was changed
- `fromString` - Previous value
- `toString` - New value
- `created` - When change was made

### **Metrics to Calculate Per Squad**

#### **Weekly Metrics (Last 7 Days)**
1. **Done**: Count of tickets moved to Done status
2. **Updated**: Count of tickets with any changelog activity
3. **Created**: Count of new tickets created
4. **Stale**: Count of in-progress tickets with no updates in 5+ days
5. **In-Progress**: Current count of tickets in progress

#### **Detailed Data Per Squad**
1. **Completed Tickets**: List of tickets moved to Done with Jira links
2. **Changelog Events**: All history log events per ticket
3. **Stale Tickets**: In-progress tickets needing review
4. **Backlog Tickets**: Tickets in backlog organized by priority

### **Data Storage Structure**

#### **Weekly Metrics File** (`data/weekly-metrics.json`)
```json
{
  "dateRange": {
    "start": "2024-08-01",
    "end": "2024-08-07",
    "display": "Aug 1-7, 2024"
  },
  "generatedAt": "2024-08-07T10:00:00Z",
  "squads": {
    "Customer-Facing": {
      "done": 5,
      "updated": 12,
      "created": 3,
      "stale": 2,
      "inProgress": 8
    },
    "HITL": {
      "done": 3,
      "updated": 8,
      "created": 1,
      "stale": 1,
      "inProgress": 6
    }
    // ... all 9 squads
  }
}
```

#### **Detailed Data File** (`data/weekly-details.json`)
```json
{
  "dateRange": {
    "start": "2024-08-01",
    "end": "2024-08-07"
  },
  "squads": {
    "Customer-Facing": {
      "completedTickets": [
        {
          "key": "PO-123",
          "summary": "Fix login button styling",
          "assignee": "John Doe",
          "completedDate": "2024-08-05"
        }
      ],
      "changelogEvents": [
        {
          "ticketKey": "PO-123",
          "author": "John Doe",
          "field": "status",
          "fromString": "In Progress",
          "toString": "Done",
          "created": "2024-08-05T14:30:00Z"
        }
      ],
      "staleTickets": [
        {
          "key": "PO-456",
          "summary": "Update user documentation",
          "assignee": "Jane Smith",
          "lastUpdated": "2024-08-02T09:15:00Z",
          "daysStale": 5
        }
      ],
      "backlogTickets": [
        {
          "key": "PO-789",
          "summary": "Implement new feature",
          "priority": "High",
          "assignee": "Bob Johnson"
        }
      ]
    }
    // ... all squads
  }
}
```

#### **Historical Data File** (`data/historical-metrics.json`)
```json
{
  "weeklyData": [
    {
      "dateRange": "2024-08-01 to 2024-08-07",
      "squads": {
        "Customer-Facing": {
          "done": 5,
          "updated": 12,
          "created": 3,
          "stale": 2,
          "inProgress": 8
        }
        // ... all squads
      }
    }
    // ... previous weeks
  ]
}
```

### **Notion Page Structure**

#### **Page Content**
1. **Title**: "Weekly Report: Aug 1-7, 2024"
2. **AI TL;DR**: Placeholder section
3. **Metrics Table**: Notion table with squad columns and metric rows
4. **What Shipped** (🚢): Completed tickets grouped by squad
5. **Change Log**: History log events per ticket per squad
6. **Stale - Needs Review**: In-progress tickets with no updates in 5+ days
7. **On Deck**: Backlog tickets organized by priority per squad

#### **Notion Table Structure**
| Squad | Customer-Facing | HITL | Developer Efficiency | Data Collection | ThoughtHub Platform | Core RCM | Voice | Medical Coding | Deep Research | Team EPIC |
|-------|----------------|------|---------------------|-----------------|-------------------|----------|-------|----------------|---------------|-----------|
| Done | 5 | 3 | 2 | 4 | 6 | 3 | 2 | 1 | 0 | 3 |
| Updated | 12 | 8 | 6 | 10 | 15 | 7 | 5 | 3 | 2 | 8 |
| Created | 3 | 1 | 4 | 2 | 5 | 2 | 1 | 0 | 1 | 2 |
| Stale | 2 | 1 | 0 | 1 | 3 | 1 | 0 | 0 | 0 | 1 |
| In-Progress | 8 | 6 | 5 | 7 | 12 | 5 | 3 | 2 | 1 | 6 |

### **JQL Queries Needed**

#### **Issues Updated in Last 7 Days**
```sql
updated >= -7d ORDER BY updated DESC
```

#### **Stale Tickets (No Updates in 15+ Days)**
```sql
status in ("In Progress") AND updated <= -15d ORDER BY updated ASC
```

#### **Completed Tickets (Moved to Done in Last 7 Days)**
```sql
status changed to Done DURING (-7d, now()) ORDER BY updated DESC
```

#### **New Tickets Created in Last 7 Days**
```sql
created >= -7d ORDER BY created DESC
```

#### **Backlog Tickets**
```sql
status in ("Backlog", "Open") ORDER BY priority DESC, created ASC
```

### **Data Processing Flow**

1. **Fetch Issues**: Get all issues updated in last 7 days
2. **Fetch Changelog**: Get all changelog events for those issues
3. **Group by Squad**: Organize data using Jira Team UUIDs
4. **Calculate Metrics**: Count done, updated, created, stale, in-progress
5. **Organize Details**: Group completed tickets, changelog events, stale tickets, backlog
6. **Store Data**: Save to weekly metrics and details files
7. **Generate Notion Page**: Create structured page with all sections
8. **Update History**: Append to historical data file
