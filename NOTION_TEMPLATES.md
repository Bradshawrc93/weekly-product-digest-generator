# Notion Page Templates & AI Prompting Guide

## Overview

This document provides templates and AI prompting guidelines for generating consistent Notion pages for the weekly product digest. Each page should follow the same structure and answer the same questions to ensure consistency across all squads and the executive summary.

## Page Structure

### 1. Executive Summary Page (High-Level)
### 2. Individual Squad Pages (Per Squad)

Both page types follow the same template structure but with different scopes of data.

---

## Template Structure

### **Page Header**
```
# [Squad Name] Weekly Digest
**Date Range**: [Start Date] to [End Date]  
**Generated**: [Timestamp]  
**Team**: [Squad Name] / [Team Members]
```

### **1. TL;DR (Executive Summary)**
**Maximum 5 bullet points** - High-level insights for executives

**Template Questions:**
- What were the most significant accomplishments this week?
- What are the key blockers or risks that need attention?
- What decisions were made that impact the broader team?
- What's the overall velocity/health of the squad?
- What should leadership be aware of for next week?

**Format:**
```markdown
## TL;DR

• **Accomplishment**: [Key achievement with impact]
• **Risk**: [Critical blocker or concern]
• **Decision**: [Important decision made]
• **Velocity**: [Team performance indicator]
• **Next Week**: [Key focus area or milestone]
```

### **2. What Shipped**
**Completed work with links to PRs, deployments, or releases**

**Template Questions:**
- What features, fixes, or improvements were completed?
- What was deployed to production?
- What customer-facing changes were made?
- What technical debt was addressed?

**Format:**
```markdown
## What Shipped

### Features
• **[Feature Name]** - [Brief description] ([PR Link])
• **[Feature Name]** - [Brief description] ([PR Link])

### Fixes & Improvements
• **[Fix Name]** - [Brief description] ([PR Link])
• **[Improvement Name]** - [Brief description] ([PR Link])

### Deployments
• **[Deployment Name]** - [Environment] ([Date])
```

### **3. Work In Flight**
**Active development items and their current status**

**Template Questions:**
- What's currently being worked on?
- What's the status of major initiatives?
- What's blocked or at risk?
- What's the expected completion timeline?

**Format:**
```markdown
## Work In Flight

### In Progress
• **[Issue Name]** - [Status] ([Assignee]) - [Expected completion]
• **[Issue Name]** - [Status] ([Assignee]) - [Expected completion]

### Blocked
• **[Issue Name]** - [Blocker description] ([Assignee])
• **[Issue Name]** - [Blocker description] ([Assignee])

### Up Next
• **[Issue Name]** - [Priority] ([Assignee])
• **[Issue Name]** - [Priority] ([Assignee])
```

### **4. Risks & Blockers**
**Issues that could impact delivery or quality**

**Template Questions:**
- What technical challenges are we facing?
- What dependencies are at risk?
- What resource constraints exist?
- What external factors could impact delivery?

**Format:**
```markdown
## Risks & Blockers

### High Priority
• **[Risk Name]** - [Impact description] - [Mitigation plan]
• **[Risk Name]** - [Impact description] - [Mitigation plan]

### Medium Priority
• **[Risk Name]** - [Impact description] - [Mitigation plan]

### Dependencies
• **[Dependency Name]** - [Status] - [Owner]
```

### **5. Decisions**
**Key decisions made this week from Slack discussions**

**Template Questions:**
- What architectural decisions were made?
- What process changes were agreed upon?
- What tooling or technology choices were made?
- What strategic direction was set?

**Format:**
```markdown
## Decisions

### Technical Decisions
• **[Decision Topic]** - [Decision made] - [Rationale] ([Slack Link])
• **[Decision Topic]** - [Decision made] - [Rationale] ([Slack Link])

### Process Decisions
• **[Decision Topic]** - [Decision made] - [Rationale] ([Slack Link])

### Strategic Decisions
• **[Decision Topic]** - [Decision made] - [Rationale] ([Slack Link])
```

### **6. Roadmap Snapshot**
**Gantt chart of workstreams/epics with timeline**

**Template Questions:**
- What are the major workstreams for this squad?
- What's the timeline for each epic?
- What's the target quarter for completion?
- What's the current progress status?

**Format:**
```markdown
## Roadmap Snapshot

### Q3 2025 (Ends Sept 30)
• **[Epic Name]** - [Progress %] - [Start: To-Do Date] → [End: Sept 30]
• **[Epic Name]** - [Progress %] - [Start: To-Do Date] → [End: Sept 30]

### Q4 2025 (Ends Dec 31)
• **[Epic Name]** - [Progress %] - [Start: To-Do Date] → [End: Dec 31]
• **[Epic Name]** - [Progress %] - [Start: To-Do Date] → [End: Dec 31]

### Q1 2026 (Ends Mar 31)
• **[Epic Name]** - [Progress %] - [Start: To-Do Date] → [End: Mar 31]
```

### **7. Team Summary**
**Activity breakdown by team with change tracking**

**Template Questions:**
- What was the overall team activity level?
- How many issues were worked on?
- What types of changes were made?
- Who were the most active team members?

**Format:**
```markdown
## Team Summary

### Activity Overview
• **Total Issues**: [Number]
• **Issues with Changes**: [Number]
• **New Items**: [Number]
• **Total Changes**: [Number]
• **Activity Level**: [No/Low/Moderate/High/Very High]

### Change Breakdown
• **Status Changes**: [Number]
• **Assignee Changes**: [Number]
• **Story Point Changes**: [Number]
• **Priority Changes**: [Number]
• **Comments**: [Number]

### Most Active Issues
• **[Issue Key]** - [Title] - [Changes] ([Assignee])
• **[Issue Key]** - [Title] - [Changes] ([Assignee])
```

### **8. Changelog**
**Detailed activity log with timestamps**

**Template Questions:**
- What specific changes were made to issues?
- Who made the changes and when?
- What was the impact of each change?
- What patterns emerge from the activity?

**Format:**
```markdown
## Changelog

### [Date]
• **[Time]** - **[User]** updated **[Issue]** - [Change description]
• **[Time]** - **[User]** updated **[Issue]** - [Change description]

### [Date]
• **[Time]** - **[User]** updated **[Issue]** - [Change description]
```

---

## AI Prompting Guidelines

### **Data Sources Integration**

**Jira Data:**
- Use issue keys, titles, and descriptions
- Include assignee names and status changes
- Reference story points and priority levels
- Link to Jira issues where possible

**Slack Data:**
- Reference specific Slack messages and threads
- Include user names and timestamps
- Link to Slack conversations
- Extract decisions and discussions

**Team Summary Data:**
- Use activity levels and change counts
- Reference most active issues
- Include team member activity

### **Tone and Style**

**Executive Summary:**
- Concise and business-focused
- Highlight impact and outcomes
- Use clear, actionable language
- Focus on strategic implications

**Squad Pages:**
- Technical but accessible
- Include specific details and context
- Use team member names
- Provide enough detail for stakeholders

### **Consistency Rules**

1. **Always answer the same questions** in each section
2. **Use consistent formatting** for similar content types
3. **Include relevant links** to Jira, Slack, and other sources
4. **Maintain the same structure** across all pages
5. **Use consistent terminology** for status, priorities, and categories

### **Quality Guidelines**

1. **Be specific** - Include issue keys, user names, dates
2. **Be concise** - Keep bullet points brief but informative
3. **Be accurate** - Double-check data from source systems
4. **Be actionable** - Include next steps where relevant
5. **Be complete** - Ensure all sections have meaningful content

---

## Executive Summary Page Specifics

### **Scope:**
- Aggregate data from all squads
- Focus on cross-squad dependencies
- Highlight company-wide impacts
- Identify patterns across teams

### **Additional Sections:**

**Cross-Squad Dependencies:**
```markdown
## Cross-Squad Dependencies

### Blocking Dependencies
• **[Squad A]** is blocked by **[Squad B]** on **[Issue]**
• **[Squad C]** depends on **[Squad D]** for **[Deliverable]**

### Shared Initiatives
• **[Initiative Name]** involves **[Squad A]**, **[Squad B]**, **[Squad C]**
• **[Initiative Name]** requires coordination between **[Squads]**
```

**Company-Wide Metrics:**
```markdown
## Company-Wide Metrics

### Velocity
• **Total Issues Completed**: [Number]
• **Average Cycle Time**: [Days]
• **Squad Performance**: [Ranking or comparison]

### Quality
• **Bugs Created**: [Number]
• **Bugs Fixed**: [Number]
• **Technical Debt**: [Assessment]
```

---

## Squad Page Specifics

### **Scope:**
- Focus on squad-specific activities
- Include detailed technical information
- Reference squad members by name
- Show squad-specific metrics

### **Squad-Specific Data:**
- Team member activity levels
- Squad-specific workstreams
- Internal squad decisions
- Squad velocity and health metrics

---

## Gantt Chart Guidelines

### **Timeline Rules:**
- **Start Date**: When issue moved to "To Do" status
- **End Date**: Target quarter end date
- **Q3 2025**: Ends September 30, 2025
- **Q4 2025**: Ends December 31, 2025
- **Q1 2026**: Ends March 31, 2026
- **Q2 2026**: Ends June 30, 2026

### **Progress Calculation:**
- **0%**: Not started (To Do)
- **25%**: In Progress
- **50%**: In Review
- **75%**: Testing
- **100%**: Done

### **Epic Grouping:**
- Group issues by epic/workstream
- Show epic-level progress
- Include epic descriptions
- Link to epic-level Jira issues

---

## Implementation Notes

### **Data Processing:**
1. **Aggregate Jira data** by squad and date range
2. **Process Slack messages** for decisions and discussions
3. **Calculate team metrics** from activity data
4. **Generate timeline data** for Gantt charts
5. **Format all data** according to templates

### **AI Prompting:**
1. **Provide clear context** about the squad and time period
2. **Include all relevant data** from Jira, Slack, and team summaries
3. **Specify the template structure** to follow
4. **Request specific formatting** for links and references
5. **Ask for consistency** across all sections

### **Quality Assurance:**
1. **Verify all links** work correctly
2. **Check data accuracy** against source systems
3. **Ensure completeness** of all sections
4. **Validate formatting** consistency
5. **Review for clarity** and actionability

This template ensures that every weekly digest page provides consistent, comprehensive, and actionable information for stakeholders at all levels.
