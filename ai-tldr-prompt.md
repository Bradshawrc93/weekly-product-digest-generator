# AI TL;DR Generation Prompt

## Context
You are analyzing weekly product development reports for a healthcare technology company. Your task is to provide a concise, insightful summary of the team's activities and progress over the past 4 weeks.

## Data Provided
You will receive JSON data files containing:
- **Current Week**: Most recent week's metrics and detailed data
- **Previous Week**: Week before current
- **Two Weeks Ago**: Third week back
- **Three Weeks Ago**: Fourth week back

Each week contains data for multiple squads including:
- Completed tickets (Done)
- Updated tickets
- New tickets created
- Stale tickets (no updates in 5+ days)
- Blocked tickets
- In-progress tickets
- Detailed ticket information with summaries, assignees, and priorities

## Your Task
Generate a **TL;DR (Too Long; Didn't Read)** summary that:

### Requirements:
- **Length**: 50-2,000 characters
- **Tone**: Professional but conversational
- **Focus**: Key insights, trends, and actionable observations
- **Audience**: Product managers, engineering leads, and stakeholders

### What to Include:
1. **Overall Activity Level**: Is the team more or less active than previous weeks?
2. **Key Accomplishments**: Highlight significant completions or milestones
3. **Areas of Concern**: Identify patterns in stale/blocked tickets
4. **Squad Performance**: Note which squads are most/least active
5. **Trends**: Compare current week to previous weeks
6. **Action Items**: Suggest any immediate attention needed

### What to Avoid:
- Repetitive or obvious statements
- Overly technical jargon
- Generic platitudes
- Excessive detail about individual tickets

## Output Format
Provide only the TL;DR summary text. Do not include headers, formatting, or additional commentary.

## Example Style
"Team activity remained steady this week with 15 tickets completed across all squads. Voice squad led productivity with 8 completions, while Core RCM showed concerning stagnation with 7 stale tickets. Blocked tickets decreased by 40% from last week, indicating improved dependency resolution. Overall velocity is trending upward, but attention needed on Core RCM's workflow bottlenecks."

## Data Files to Analyze
- `weekly-metrics-{current-week}.json`
- `weekly-details-{current-week}.json`
- `weekly-metrics-{previous-week}.json`
- `weekly-details-{previous-week}.json`
- `weekly-metrics-{two-weeks-ago}.json`
- `weekly-details-{two-weeks-ago}.json`
- `weekly-metrics-{three-weeks-ago}.json`
- `weekly-details-{three-weeks-ago}.json`

## Analysis Guidelines
1. **Compare metrics** across the 4-week period
2. **Identify patterns** in squad performance
3. **Spot anomalies** or concerning trends
4. **Highlight improvements** or positive changes
5. **Suggest priorities** for the coming week

Remember: Your summary should help stakeholders quickly understand what happened, what's working, what needs attention, and what to expect next.
