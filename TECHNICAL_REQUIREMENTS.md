# Technical Requirements - Weekly Jira Report Generator

## Overview

This document defines the technical requirements for a focused weekly report generator that creates Notion pages summarizing Jira activity over the past 7 days, organized by squad/team.

## Core Agent Responsibilities

### 1. **Jira Data Collection**
- **Issue Fetching**: Retrieve all Jira issues updated in the last 7 days
- **Team/Squad Filtering**: Organize data by Jira Team field
- **Changelog Collection**: Gather all history log events from the last 7 days
- **Status Tracking**: Monitor ticket status changes and assignments

### 2. **Data Processing & Analysis**
- **Work Completed**: Identify issues with work done in the last 7 days
- **Stale Ticket Detection**: Find tickets in progress with no updates in last 5 days
- **Action Counting**: Count all activities (comments, status changes, PRs, etc.) per squad
- **Assignee Analysis**: Track tickets per assignee broken down by status

### 3. **Report Generation**
- **Weekly Notion Page**: Create structured Notion page in database
- **Squad Summaries**: Per-squad breakdown of completed work
- **Stale Ticket Reports**: List of tickets needing attention per squad
- **Changelog Rollup**: Chronological list of all actions per squad
- **Action Metrics**: Weekly action counts for trend analysis

### 4. **Data Persistence**
- **Action Logging**: Maintain rolling file of weekly action counts per squad
- **Historical Data**: Store data for future graphing and trend analysis

## Technical Specifications

### Architecture Requirements

#### **Modular Design**
- **Jira Connector**: Module for Jira API integration and data fetching
- **Data Processor**: Module for organizing and analyzing Jira data
- **Report Generator**: Module for creating Notion page content
- **Notion Publisher**: Module for writing to Notion database
- **Data Logger**: Module for persisting action counts and historical data

#### **Configuration Management**
- **Environment Variables**: Jira API credentials, Notion API key, database ID
- **Squad Configuration**: Mapping of Jira Team names to display names
- **Status Configuration**: Mapping of Jira statuses to categories (backlog, to-do, in-progress, done)
- **Report Templates**: Notion page structure and formatting

#### **Data Management**
- **Incremental Processing**: Only fetch data updated since last run
- **Error Handling**: Robust error handling with retry logic
- **Rate Limiting**: Respect Jira API rate limits
- **Data Validation**: Ensure data integrity and completeness

### Integration Requirements

#### **Jira Integration**
- **Authentication**: API token authentication
- **Data Fetching**: Issues updated in last 7 days, changelog history, team assignments
- **JQL Support**: Query for issues by update date, team, and status
- **Changelog Access**: Retrieve all history log events for specified time period
- **Team Field**: Access to Jira Team custom field for squad organization

#### **Notion Integration**
- **Database Access**: Write access to specified Notion database
- **Page Creation**: Generate structured pages with squad sections
- **Rich Content**: Support for formatted text, lists, and links
- **Template Structure**: Consistent page layout and formatting

### Output Requirements

#### **Notion Page Structure**
- **Page Title**: Weekly report with date range (e.g., "Weekly Report: Aug 1-7, 2024")
- **Squad Sections**: Separate section for each squad/team
- **Work Completed**: List of issues with work done in last 7 days
- **Stale Tickets**: List of in-progress tickets with no updates in last 5 days
- **Changelog**: Chronological list of all actions per squad
- **Assignee Breakdown**: Tickets per assignee by status category

#### **Data Files**
- **Action Counts**: JSON file with weekly action counts per squad
- **Historical Data**: Rolling log of action counts for trend analysis
- **Status Breakdown**: Per-assignee ticket counts by status category

### Performance Requirements

#### **Data Processing**
- **Weekly Execution**: Run once per week to generate report
- **Efficient Queries**: Optimize Jira API calls to minimize response time
- **Data Caching**: Cache squad and status mappings to reduce API calls
- **Error Recovery**: Handle API failures gracefully with retry logic

#### **Reliability**
- **Data Accuracy**: Ensure all Jira data is captured correctly
- **Consistent Formatting**: Maintain consistent Notion page structure
- **Backup Data**: Preserve action count data for historical analysis
- **Logging**: Track execution times and any errors encountered

#### **Security**
- **API Key Storage**: Secure storage of Jira and Notion API credentials
- **Data Access**: Only access authorized Jira projects and Notion databases
- **Audit Trail**: Log all data access and modifications

## Workflow Requirements

### **Weekly Report Generation**
- **Automatic Execution**: Run weekly to generate report for previous 7 days
- **Date Range**: Monday to Sunday (or configurable week boundaries)
- **Report Creation**: Generate new Notion page in database
- **Data Logging**: Update action count files for historical tracking

### **Data Collection Process**
1. **Fetch Jira Issues**: Get all issues updated in last 7 days
2. **Organize by Squad**: Group issues by Jira Team field
3. **Collect Changelog**: Gather all history events from last 7 days
4. **Identify Stale Tickets**: Find in-progress tickets with no recent updates
5. **Count Actions**: Tally all activities per squad

### **Report Structure**
1. **Page Creation**: Create new Notion page with date range title
2. **Squad Sections**: Add section for each squad with work completed
3. **Stale Ticket Lists**: Include tickets needing attention per squad
4. **Changelog Summary**: List all actions chronologically per squad
5. **Assignee Breakdown**: Show ticket counts per assignee by status

## Quality Assurance

### **Testing Requirements**
- **Jira API Testing**: Verify data fetching and changelog access
- **Notion API Testing**: Test page creation and formatting
- **Data Processing Testing**: Validate squad organization and action counting
- **End-to-End Testing**: Full weekly report generation workflow

### **Data Validation**
- **Jira Data Accuracy**: Ensure all issues and changelog events are captured
- **Squad Mapping**: Verify correct team field mapping and organization
- **Action Counting**: Validate accurate counting of all activities
- **Notion Output**: Confirm proper page structure and formatting

### **Error Handling**
- **API Failures**: Handle Jira and Notion API errors gracefully
- **Data Inconsistencies**: Handle missing or malformed Jira data
- **Rate Limiting**: Respect API limits and implement retry logic
- **Logging**: Comprehensive logging for debugging and monitoring

## Success Criteria

### **Functional Success**
- **Weekly Reports**: Generate consistent weekly Notion pages with date range
- **Squad Coverage**: Include all squads with Jira activity in the last 7 days
- **Data Completeness**: Capture all issues, changelog events, and actions
- **Stale Ticket Detection**: Accurately identify tickets needing attention

### **Technical Success**
- **Jira Integration**: Reliable data fetching from Jira API
- **Notion Publishing**: Consistent page creation and formatting
- **Action Counting**: Accurate tallying of all activities per squad
- **Data Persistence**: Reliable storage of historical action counts

### **Business Success**
- **Time Savings**: Automate weekly reporting process
- **Visibility**: Provide clear view of squad activity and progress
- **Action Tracking**: Enable trend analysis through action count data
- **Stale Ticket Management**: Help identify tickets needing attention

## Implementation Phases

### **Phase 1: Jira Integration & Basic Reporting**
- Jira API integration for issue and changelog fetching
- Squad/team organization by Jira Team field
- Basic Notion page creation with squad sections
- Action counting and data logging

### **Phase 2: Enhanced Reporting & Stale Ticket Detection**
- Stale ticket identification (no updates in 5 days)
- Detailed changelog rollup per squad
- Assignee breakdown by status categories
- Improved Notion page formatting and structure

### **Phase 3: Data Analysis & Historical Tracking**
- Historical action count tracking and storage
- Trend analysis capabilities
- Enhanced error handling and validation
- Performance optimization

### **Phase 4: Slack Integration (Future)**
- Slack data collection and integration
- Combined Jira + Slack reporting
- Enhanced action tracking across platforms
- Advanced analytics and insights

---

*This document serves as the definitive guide for implementing the Weekly Jira Report Generator. All development should align with these requirements to ensure a successful, focused, and maintainable solution.*

## Key Data Points to Track

### **Per Squad (Team)**
- **Work Completed**: Issues with activity in last 7 days
- **Stale Tickets**: In-progress tickets with no updates in last 5 days
- **Action Count**: Total number of activities (comments, status changes, etc.)
- **Changelog Events**: Chronological list of all actions

### **Per Assignee**
- **Ticket Counts**: Number of tickets by status category
- **Status Breakdown**: Backlog, To-Do, In Progress, Done
- **Activity Level**: Based on recent updates and actions

### **Historical Data**
- **Weekly Action Counts**: Rolling file of actions per squad per week
- **Trend Data**: For future graphing and analysis
- **Performance Metrics**: For team velocity tracking
