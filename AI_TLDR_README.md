# AI TL;DR Generation System

## Overview
This system provides a standardized way to generate AI-powered TL;DR summaries for weekly product development reports. It analyzes 4 weeks of historical data to provide insights, trends, and actionable observations.

## Files Created

### 1. `ai-tldr-prompt.md`
- **Purpose**: Standardized prompt template for OpenAI
- **Content**: Detailed instructions for AI analysis
- **Usage**: Copy content and send to AI with data files

### 2. `src/utils/aiDataPreparer.js`
- **Purpose**: Utility to prepare and organize historical data
- **Features**: 
  - Collects 4 most recent weeks of data
  - Creates data summaries
  - Generates analysis packages

### 3. `scripts/prepare-ai-data.js`
- **Purpose**: CLI tool to prepare data for AI analysis
- **Usage**: `node scripts/prepare-ai-data.js`

## How to Use

### Step 1: Generate Weekly Report
```bash
# Generate the latest weekly report (creates data files)
npm start
```

### Step 2: Prepare AI Data Package
```bash
# Prepare 4 weeks of data for AI analysis
node scripts/prepare-ai-data.js
```

### Step 3: Generate AI TL;DR
1. **Copy the prompt**: Copy content from `ai-tldr-prompt.md`
2. **Attach data files**: Attach the 8 JSON files listed by the script
3. **Send to AI**: Paste prompt and request TL;DR summary
4. **Get insights**: AI will analyze trends and provide recommendations

## Data Files Structure

### Weekly Metrics Files
- **Format**: `weekly-metrics-YYYY-MM-DD.json`
- **Content**: Aggregated metrics per squad
- **Metrics**: Done, Updated, Created, Stale, Blocked, In-Progress

### Weekly Details Files
- **Format**: `weekly-details-YYYY-MM-DD.json`
- **Content**: Detailed ticket information
- **Data**: Ticket summaries, assignees, priorities, status changes

### Historical Metrics
- **File**: `historical-metrics.json`
- **Content**: 52 weeks of aggregated data
- **Purpose**: Long-term trend analysis

## AI Analysis Package

The system generates `ai-analysis-package.json` containing:

```json
{
  "metadata": {
    "generatedAt": "2025-08-12T13:56:42.083Z",
    "totalWeeks": 4,
    "dataFiles": [...]
  },
  "summary": {
    "totalWeeks": 4,
    "weeks": [...],
    "overallStats": {
      "totalSquads": 10,
      "totalCompleted": 15,
      "totalStale": 45,
      "totalBlocked": 8,
      "totalCreated": 12
    }
  },
  "detailedData": [...]
}
```

## What the AI Analyzes

### 4-Week Rolling Window
- **Current Week**: Most recent data
- **Previous Week**: Week before current
- **Two Weeks Ago**: Third week back
- **Three Weeks Ago**: Fourth week back

### Key Metrics Tracked
- **Productivity**: Completed tickets per squad
- **Velocity**: Creation vs. completion rates
- **Bottlenecks**: Stale and blocked tickets
- **Activity**: Updates and in-progress work
- **Trends**: Week-over-week comparisons

### Analysis Focus Areas
1. **Overall Activity Level**: Team productivity trends
2. **Key Accomplishments**: Significant completions
3. **Areas of Concern**: Stale/blocked ticket patterns
4. **Squad Performance**: Most/least active teams
5. **Action Items**: Immediate attention needed

## Example AI Output

```
Team activity increased 25% this week with 18 tickets completed across all squads. Voice squad led productivity with 8 completions, while Core RCM showed concerning stagnation with 12 stale tickets. Blocked tickets decreased by 60% from last week, indicating improved dependency resolution. Overall velocity is trending upward, but attention needed on Core RCM's workflow bottlenecks and HITL squad's 5 blocked tickets requiring immediate unblocking.
```

## Integration with Notion

### Current Status
- **Placeholder**: AI TL;DR section exists in Notion pages
- **Manual Process**: Currently requires manual AI analysis
- **Future Enhancement**: Could be automated with OpenAI API integration

### Future Automation
```javascript
// Potential future implementation
const aiTLDR = await generateAITLDR(historicalData);
notionPageGenerator.updateAITLDRSection(aiTLDR);
```

## Best Practices

### For Consistent Results
1. **Use the same prompt**: Always use `ai-tldr-prompt.md`
2. **Include all 4 weeks**: Ensure complete historical context
3. **Review AI output**: Validate insights before sharing
4. **Update regularly**: Generate weekly for fresh insights

### For Better Insights
1. **Context matters**: Include business context in prompt if needed
2. **Focus on trends**: Ask for week-over-week comparisons
3. **Actionable items**: Request specific recommendations
4. **Squad-specific**: Ask for individual team insights

## Troubleshooting

### Common Issues
- **Missing data files**: Run weekly report generation first
- **Insufficient history**: Need at least 1 week of data
- **AI context limits**: May need to summarize data for large datasets
- **Prompt clarity**: Ensure prompt is specific and clear

### Data Validation
```bash
# Check available data
ls -la data/weekly-*.json

# Validate data structure
node -e "console.log(JSON.parse(require('fs').readFileSync('data/weekly-metrics-2025-08-10.json')).squads)"
```

## Future Enhancements

### Potential Improvements
1. **Automated AI integration**: Direct OpenAI API calls
2. **Trend visualization**: Charts and graphs
3. **Predictive analytics**: Forecast future workload
4. **Squad comparisons**: Benchmark performance
5. **Custom insights**: Business-specific analysis

### API Integration
```javascript
// Future OpenAI integration
const openai = new OpenAI(process.env.OPENAI_API_KEY);
const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: prompt },
    { role: "user", content: JSON.stringify(dataPackage) }
  ]
});
```

## Support

For issues or questions:
1. Check data file availability
2. Validate JSON structure
3. Review prompt clarity
4. Test with smaller datasets
5. Consult logs for errors
