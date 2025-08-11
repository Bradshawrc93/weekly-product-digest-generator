# Gantt Chart Helper & Timeline Calculations

## Overview

This document provides specific guidelines for generating Gantt chart data for the roadmap snapshot section of Notion pages. It focuses on timeline calculations, progress tracking, and epic grouping.

## Timeline Rules

### **Quarter End Dates**
- **Q3 2025**: September 30, 2025
- **Q4 2025**: December 31, 2025  
- **Q1 2026**: March 31, 2026
- **Q2 2026**: June 30, 2026
- **Q3 2026**: September 30, 2026
- **Q4 2026**: December 31, 2026

### **Start Date Calculation**
- **Start Date**: When issue moved to "To Do" status
- **Source**: Jira changelog - look for status change to "To Do"
- **Fallback**: If no "To Do" date found, use issue creation date

### **End Date Calculation**
- **End Date**: Target quarter end date (from custom field)
- **Source**: Jira custom field for target quarter
- **Mapping**: 
  - "Q3 2025" → September 30, 2025
  - "Q4 2025" → December 31, 2025
  - "Q1 2026" → March 31, 2026
  - etc.

## Progress Calculation

### **Status-Based Progress**
```javascript
const progressMap = {
  'To Do': 0,
  'In Progress': 25,
  'In Review': 50,
  'Testing': 75,
  'Done': 100
};
```

### **Epic-Level Progress**
- **Calculate average** of all issues in the epic
- **Weight by story points** if available
- **Show as percentage** (e.g., "45%")

## Epic Grouping Logic

### **Epic Identification**
1. **Primary**: Use Epic Link field (`customfield_10014`)
2. **Secondary**: Group by workstream if no epic link
3. **Fallback**: Group by issue type (Story, Bug, Task)

### **Epic Data Structure**
```javascript
{
  epicKey: "EPIC-123",
  epicName: "Voice Integration",
  targetQuarter: "Q3 2025",
  startDate: "2025-08-01", // Earliest To-Do date
  endDate: "2025-09-30",   // Quarter end
  progress: 45,            // Percentage
  issues: [
    {
      key: "PO-123",
      title: "Implement voice API",
      status: "In Progress",
      assignee: "John Doe",
      storyPoints: 5,
      startDate: "2025-08-01",
      progress: 25
    }
  ]
}
```

## Gantt Chart Generation

### **Data Processing Steps**

1. **Collect Issues by Squad**
   ```javascript
   const squadIssues = jiraData.issues.filter(issue => 
     issue.fields.customfield_10001 === squadTeamId
   );
   ```

2. **Group by Epic**
   ```javascript
   const epicGroups = groupByEpic(squadIssues);
   ```

3. **Calculate Timeline Data**
   ```javascript
   const timelineData = epicGroups.map(epic => ({
     name: epic.name,
     start: getEarliestToDoDate(epic.issues),
     end: getTargetQuarterEnd(epic.targetQuarter),
     progress: calculateEpicProgress(epic.issues)
   }));
   ```

4. **Format for Display**
   ```markdown
   ### Q3 2025 (Ends Sept 30)
   • **Voice Integration** - 45% - [Start: Aug 01] → [End: Sept 30]
   • **Prior Auth System** - 75% - [Start: Jul 15] → [End: Sept 30]
   ```

### **Example Output**

```markdown
## Roadmap Snapshot

### Q3 2025 (Ends Sept 30)
• **Voice Integration** - 45% - [Start: Aug 01] → [End: Sept 30]
  - PO-123: Implement voice API (In Progress, 25%)
  - PO-124: Voice UI components (To Do, 0%)
  - PO-125: Voice testing framework (Done, 100%)

• **Prior Auth System** - 75% - [Start: Jul 15] → [End: Sept 30]
  - PO-126: Auth API endpoints (Done, 100%)
  - PO-127: Auth UI integration (In Progress, 50%)
  - PO-128: Auth documentation (To Do, 0%)

### Q4 2025 (Ends Dec 31)
• **Data Analytics Platform** - 0% - [Start: Oct 01] → [End: Dec 31]
  - PO-129: Analytics dashboard (To Do, 0%)
  - PO-130: Data pipeline (To Do, 0%)
```

## Implementation Functions

### **Get Target Quarter End Date**
```javascript
function getTargetQuarterEnd(targetQuarter) {
  const quarterEnds = {
    'Q3 2025': '2025-09-30',
    'Q4 2025': '2025-12-31',
    'Q1 2026': '2026-03-31',
    'Q2 2026': '2026-06-30',
    'Q3 2026': '2026-09-30',
    'Q4 2026': '2026-12-31'
  };
  return quarterEnds[targetQuarter] || null;
}
```

### **Get Issue To-Do Date**
```javascript
function getIssueToDoDate(issue) {
  // Look for status change to "To Do" in changelog
  const toDoChange = issue.changelog.histories.find(history =>
    history.items.some(item => 
      item.field === 'status' && 
      item.toString === 'To Do'
    )
  );
  
  if (toDoChange) {
    return moment(toDoChange.created).format('YYYY-MM-DD');
  }
  
  // Fallback to creation date
  return moment(issue.fields.created).format('YYYY-MM-DD');
}
```

### **Calculate Epic Progress**
```javascript
function calculateEpicProgress(issues) {
  if (issues.length === 0) return 0;
  
  const totalProgress = issues.reduce((sum, issue) => {
    const progress = getIssueProgress(issue);
    const storyPoints = issue.fields.customfield_10030 || 1;
    return sum + (progress * storyPoints);
  }, 0);
  
  const totalStoryPoints = issues.reduce((sum, issue) => 
    sum + (issue.fields.customfield_10030 || 1), 0
  );
  
  return Math.round(totalProgress / totalStoryPoints);
}
```

### **Get Issue Progress**
```javascript
function getIssueProgress(issue) {
  const status = issue.fields.status.name;
  const progressMap = {
    'To Do': 0,
    'In Progress': 25,
    'In Review': 50,
    'Testing': 75,
    'Done': 100
  };
  return progressMap[status] || 0;
}
```

## Quality Checks

### **Data Validation**
1. **Verify target quarter** exists in mapping
2. **Check start date** is before end date
3. **Ensure progress** is between 0-100%
4. **Validate epic grouping** is logical

### **Display Validation**
1. **Format dates** consistently (YYYY-MM-DD)
2. **Show progress** as percentages
3. **Include issue details** for context
4. **Group by quarter** chronologically

## Integration with Notion

### **Markdown Format**
```markdown
### [Quarter] (Ends [Date])
• **[Epic Name]** - [Progress]% - [Start: Date] → [End: Date]
  - [Issue Key]: [Title] ([Status], [Progress]%)
  - [Issue Key]: [Title] ([Status], [Progress]%)
```

### **Notion Properties**
- **Epic Name**: Text
- **Progress**: Number (0-100)
- **Start Date**: Date
- **End Date**: Date
- **Quarter**: Select
- **Squad**: Relation

This helper ensures consistent and accurate Gantt chart generation for the roadmap snapshot section.
