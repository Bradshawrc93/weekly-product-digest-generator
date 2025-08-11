const { Client } = require('@notionhq/client');
const { logger } = require('../utils/logger');
const moment = require('moment');
const OpenAI = require('openai');

class NotionPublisher {
  constructor() {
    this.client = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    this.databaseId = process.env.NOTION_DATABASE_ID;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Create the main weekly page with subpages for each squad
   */
  async createWeeklyPage(squadsData, dateRange) {
    const startDate = moment(dateRange.startDate);
    const endDate = moment(dateRange.endDate);
    const generatedTime = moment().format('MMM DD, YYYY [at] h:mm A');
    
    const title = `Weekly Digest - ${startDate.format('MMM DD')} to ${endDate.format('MMM DD, YYYY')}`;
    
    logger.info('Creating weekly page', { title, databaseId: this.databaseId });
    
    try {
      // Generate AI-enhanced content for specific sections
      const aiContent = await this.generateAIEnhancedExecutiveSummary(squadsData, dateRange, generatedTime);
      
      // Create the full page content using the template structure
      const fullContent = this.createFullPageContent(aiContent, squadsData, dateRange, generatedTime);
      
      // Convert to blocks and check if we need to chunk
      const allBlocks = this.convertMarkdownToNotionBlocks(fullContent);
      
      // Create the main weekly page with initial content (first 95 blocks to be safe)
      const initialBlocks = allBlocks.slice(0, 95);
      const weeklyPage = await this.client.pages.create({
        parent: {
          database_id: this.databaseId,
        },
        properties: {
          'Name': {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
        },
        children: initialBlocks,
      });

      logger.info('Weekly page created successfully', { 
        pageId: weeklyPage.id,
        title: title,
        initialBlocks: initialBlocks.length,
        totalBlocks: allBlocks.length
      });

      // If we have more content, append it in chunks
      if (allBlocks.length > 95) {
        const remainingBlocks = allBlocks.slice(95);
        await this.appendBlocksInChunks(weeklyPage.id, remainingBlocks);
        logger.info('Appended remaining content in chunks', { 
          remainingBlocks: remainingBlocks.length 
        });
      }

      // Create subpages for each squad
      const squadSubpages = [];
      for (const squadData of squadsData) {
        try {
          const squadSubpage = await this.createSquadSubpage(weeklyPage.id, squadData, dateRange, generatedTime);
          squadSubpages.push(squadSubpage);
        } catch (error) {
          logger.error('Failed to create squad subpage', { 
            squad: squadData.squad.name,
            error: error.message 
          });
        }
      }

      // Squad subpages are already created and linked to the parent page
      // No need to replace anything - the "## 📄 Squad Pages" heading is already there
      // and the squad subpages are already visible as child pages in Notion
      
      logger.info('Squad subpages created successfully - no replacement needed', { 
        weeklyPageId: weeklyPage.id,
        squadSubpagesCount: squadSubpages.length
      });

      return {
        weeklyPage,
        squadSubpages
      };
    } catch (error) {
      logger.error('Failed to create weekly page', { 
        error: error.message,
        title: title 
      });
      throw error;
    }
  }

  /**
   * Create a subpage for a specific squad within the weekly page
   */
  async createSquadSubpage(parentPageId, squadData, dateRange, generatedTime) {
    const squad = squadData.squad;
    const startDate = moment(dateRange.startDate);
    const endDate = moment(dateRange.endDate);
    
    const title = `${squad.name} - ${startDate.format('MMM Do')} to ${endDate.format('MMM Do')}`;
    
    logger.info('Creating squad subpage', { 
      squad: squad.name,
      title: title,
      parentPageId: parentPageId
    });

    // Generate AI-enhanced squad content
    const squadContent = await this.generateAIEnhancedSquadContent(squadData, dateRange, generatedTime);

    // Convert to blocks and check if we need to chunk
    const allBlocks = this.convertMarkdownToNotionBlocks(squadContent);
    
    // Create the subpage with initial content (first 95 blocks to be safe)
    const initialBlocks = allBlocks.slice(0, 95);
    const subpage = await this.client.pages.create({
      parent: {
        page_id: parentPageId,
      },
      properties: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
      children: initialBlocks,
    });

    logger.info('Squad subpage created successfully', { 
      squad: squad.name,
      pageId: subpage.id,
      initialBlocks: initialBlocks.length,
      totalBlocks: allBlocks.length
    });

    // If we have more content, append it in chunks
    if (allBlocks.length > 95) {
      const remainingBlocks = allBlocks.slice(95);
      await this.appendBlocksInChunks(subpage.id, remainingBlocks);
      logger.info('Appended remaining content to squad subpage', { 
        squad: squad.name,
        remainingBlocks: remainingBlocks.length 
      });
    }

    return {
      squad: squad.name,
      pageId: subpage.id,
      title: title,
    };
  }

  /**
   * Generate AI-enhanced executive summary content
   */
  async generateAIEnhancedExecutiveSummary(squadsData, dateRange, generatedTime) {
    const startDate = moment(dateRange.startDate);
    const endDate = moment(dateRange.endDate);
    
    // Prepare data for AI
    const dataForAI = this.prepareDataForAI(squadsData, 'executive_summary');
    
    const prompt = `You are an expert product operations analyst and technical writer. Your task is to fill in specific sections of a weekly product operations digest template with relevant content.

**IMPORTANT: You are NOT creating the entire page structure. You are filling in specific content sections based on the provided data.**

**Data Summary:**
${dataForAI}

**Template Structure to Fill:**

## 🎯 Executive Summary (TL;DR)
[Generate 2-3 sentences summarizing the week's key highlights and business impact]

## 📈 Key Metrics & Highlights
**Activity Overview:**
• **Total Jira Items with Updates:** [Use actual number from data]
• **Jira tickets moved to done:** [List tickets currently in Done/Closed/Resolved status - use the "Done Tickets" data provided]
• **Total Risks Identified:** [Use actual number from data]
• **Active Squads:** [Use actual numbers from data]
• **Cross-Squad Dependencies:** [Analyze and provide number]

## 👥 Squad Activity Summary
**Active Squads:**
[Format as: • **Squad Name:** X issues, Y decisions, Z risks, W threads]

**Quiet Squads:**
[List squads with no activity]

## 💬 General Product Conversations
[Summarize cross-squad discussions and decisions with clickable Slack links]

## 🔗 Cross-Squad Dependencies & Coordination
[Analyze dependencies between squads and coordination needs]

## ⚠️ Risks & Blockers
[Summarize identified risks, blockers, and mitigation strategies]

## 🎯 Recommended Actions
[Provide 3-5 actionable recommendations for leadership and teams]

**CRITICAL REQUIREMENTS:**
- Use bullet points (•) for all lists
- Include clickable Jira and Slack links
- Bold squad names when mentioned
- Keep content concise and actionable
- Do NOT include any footer text or separators
- **ABSOLUTELY DO NOT include any "Squad Pages" section or links - this will be added separately**
- **DO NOT create any page links or references to squad pages**
- **ONLY generate content for the sections listed above**

Format the response as clean markdown that will work well in Notion with rich text formatting.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a product operations specialist who creates clear, actionable weekly summaries for product teams."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      let content = completion.choices[0].message.content;
      
      // Remove any Squad Pages section that the AI might have generated
      content = content.replace(/## 📄 Squad Pages[\s\S]*?(?=##|$)/gi, '');
      content = content.replace(/## Squad Pages[\s\S]*?(?=##|$)/gi, '');
      content = content.replace(/### Squad Pages[\s\S]*?(?=###|##|$)/gi, '');
      
      return content;
    } catch (error) {
      logger.error('Failed to generate AI-enhanced executive summary', { error: error.message });
      // Fallback to basic content
      return this.generateBasicExecutiveSummary(squadsData, dateRange, generatedTime);
    }
  }

  /**
   * Create full page content using template structure
   */
  createFullPageContent(aiContent, squadsData, dateRange, generatedTime) {
    const startDate = moment(dateRange.startDate);
    const endDate = moment(dateRange.endDate);
    
    // Calculate metrics
    const totalIssues = squadsData.reduce((sum, squad) => sum + (squad.jiraData?.issues?.length || 0), 0);
    const totalDecisions = squadsData.reduce((sum, squad) => sum + (squad.slackData?.decisions?.length || 0), 0);
    const totalRisks = squadsData.reduce((sum, squad) => sum + (squad.slackData?.risks?.length || 0), 0);
    const totalThreads = squadsData.reduce((sum, squad) => sum + (squad.slackData?.threads?.length || 0), 0);
    
    const activeSquads = squadsData.filter(squad => 
      (squad.jiraData?.issues?.length || 0) > 0 || 
      (squad.slackData?.decisions?.length || 0) > 0 ||
      (squad.slackData?.risks?.length || 0) > 0 ||
      (squad.slackData?.threads?.length || 0) > 0
    );

    return `# 📊 Weekly Product Operations Digest

**Date Range:** ${startDate.format('MMM DD')} to ${endDate.format('MMM DD, YYYY')}  
**Generated:** ${generatedTime}  
**Total Squads:** ${squadsData.length}

---

${aiContent}

---

## 📅 Epic Timeline & Strategic Initiatives

do an embed of this link [https://thoughtfulautomation.atlassian.net/jira/plans/641/scenarios/641/timeline?vid=879]

---

## 📄 Squad Pages

[This section will be populated automatically with working page links after squad subpages are created]`;
  }

  /**
   * Generate AI-enhanced squad content
   */
  async generateAIEnhancedSquadContent(squadData, dateRange, generatedTime) {
    const squad = squadData.squad;
    const startDate = moment(dateRange.startDate);
    const endDate = moment(dateRange.endDate);
    
    // Prepare data for AI
    const dataForAI = this.prepareDataForAI([squadData], 'squad_detail');
    
    const prompt = `You are an expert product operations analyst, technical writer, and Notion UI/UX specialist. Your task is to create a comprehensive, professional squad report for a weekly product operations digest with beautiful Notion styling.

**Your primary goal is to create a visually stunning, professional Notion page that is easy to scan and looks great when rendered.**

Create a comprehensive, well-structured squad page for Notion with the following requirements:

**Context:**
- Squad Name: ${squad.name}
- Date Range: ${startDate.format('MMM DD')} to ${endDate.format('MMM DD, YYYY')}
- Generated: ${generatedTime}

**Template Placeholders:**
- Replace [Squad Name] with: ${squad.name}
- Replace [Date Range] with: ${startDate.format('MMM DD')} to ${endDate.format('MMM DD, YYYY')}
- Replace [Timestamp] with: ${generatedTime}

**Squad Data:**
${dataForAI}

**Requirements:**
1. Create a detailed, professional squad report with beautiful Notion formatting
2. Use clear, technical but accessible language with proper bold formatting (use **text** for emphasis)
3. Highlight accomplishments, challenges, and next steps with strategic emojis
4. Include specific details from Jira issues and Slack discussions
5. Format for Notion with proper headings, bullet points, and rich text
6. Make it informative for both squad members and stakeholders
7. Include actionable insights and recommendations
8. Include Jira ticket links when mentioning specific tickets
9. Include Slack message links when referencing conversations
10. **CRITICAL**: Use the "Categorization Guide" provided to accurately place tickets in "What Shipped" vs "Work In Flight" sections
11. **CRITICAL**: For the Changelog section, you MUST copy the exact "Detailed Changelog" data provided below. DO NOT generate any content. If the data shows "No changes detected", write exactly that. If the data shows actual changes, copy them exactly as provided. DO NOT add any AI-generated content to this section.

**Template Structure:**
Use this exact structure and formatting:

# [Squad Name] - [Date Range]

**Generated:** [Timestamp]

---

## 📊 TL;DR (Executive Summary)

[AI-generated 2-3 sentence overview of the squad's key highlights and accomplishments]

---

## 🚀 What Shipped

[AI-generated list of completed work with Jira links - only tickets in Done/Closed/Resolved status]

---

## 🔄 Work In Flight

[AI-generated list of active work with Jira links - tickets in all other statuses]

---

## ⚠️ Risks & Blockers

[AI-generated summary of identified risks, blockers, and mitigation strategies]

---

## 💡 Decisions

[AI-generated summary of key decisions made with Slack links]

---

## 📈 Team Summary

[AI-generated insights about team activity, velocity, and trends]

---

## 📝 Changelog

[Use the exact "Detailed Changelog" data provided below. DO NOT generate content - copy the data exactly as provided.]

**IMPORTANT:** Generate ONLY the content above. Do NOT include any of the styling guidelines or requirements in your response.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a product operations specialist who creates detailed, actionable squad reports for product teams.

**Notion UI/Styling Guidelines:**
- Create a beautiful, professional Notion page with excellent visual hierarchy
- Use bold text for emphasis, not plain asterisks
- Add strategic emojis to main section headers for visual appeal
- Use bullet points (•) for lists - NEVER use dashes (-)
- Keep paragraphs concise and scannable with proper spacing
- Use proper markdown that will render beautifully in Notion
- Include specific issue keys, user names, and relevant details
- Include clickable links for Jira tickets and Slack messages
- Remove any markdown artifacts like \`\`\` or stray asterisks
- ALWAYS bold squad names when mentioned: Voice, Core RCM, etc.
- Use callout blocks or highlighted sections for important information
- Create visual separation between sections with proper spacing
- Use consistent formatting throughout the page
- Make the page easy to scan and visually appealing

**Critical Notion-Specific Requirements:**
- DO NOT include \`\`\`markdown at the beginning or end
- DO NOT use plain asterisks (*) for emphasis - only use **bold**
- DO NOT use dashes (-) for bullet points - ONLY use bullet points (•)
- ALWAYS include Jira links when mentioning ticket keys
- ALWAYS include Slack permalinks when mentioning conversations
- DO NOT include a Gantt chart section (this is only on the main overview page)
- ALWAYS bold squad names when they appear in text
- DO NOT include any footer text like "This Notion page has been meticulously crafted..." or similar explanatory text at the end
- DO NOT include any explanatory text under section headers
- Focus on creating a beautiful, professional Notion page that looks great when rendered`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('Failed to generate AI-enhanced squad content', { 
        squad: squad.name,
        error: error.message 
      });
      // Fallback to basic content
      return this.generateBasicSquadContent(squadData, dateRange, generatedTime);
    }
  }

  /**
   * Prepare data for AI processing
   */
  prepareDataForAI(squadsData, type) {
    if (type === 'executive_summary') {
      // Aggregate data across all squads
      const totalIssues = squadsData.reduce((sum, squad) => sum + (squad.jiraData?.issues?.length || 0), 0);
      const totalDecisions = squadsData.reduce((sum, squad) => sum + (squad.slackData?.decisions?.length || 0), 0);
      const totalRisks = squadsData.reduce((sum, squad) => sum + (squad.slackData?.risks?.length || 0), 0);
      const totalThreads = squadsData.reduce((sum, squad) => sum + (squad.slackData?.threads?.length || 0), 0);
      const generalThreads = squadsData.reduce((sum, squad) => sum + (squad.slackData?.generalThreads?.length || 0), 0);
    
      const activeSquads = squadsData.filter(squad => 
        (squad.jiraData?.issues?.length || 0) > 0 || 
        (squad.slackData?.decisions?.length || 0) > 0 ||
        (squad.slackData?.risks?.length || 0) > 0 ||
        (squad.slackData?.threads?.length || 0) > 0
      );

      // Collect all epics for Gantt chart
      const allEpics = [];
      squadsData.forEach(squad => {
        if (squad.jiraData?.issues) {
          squad.jiraData.issues.forEach(issue => {
            // Check for Epic type - try different possible field names
            const issueType = issue.fields.issuetype?.name || issue.fields.issuetype?.value;
            if (issueType === 'Epic' || issueType === 'epic') {
              // Try different possible field names for target quarter
              const targetQuarter = issue.fields.customfield_10002 || 
                                   issue.fields['Target Quarter'] || 
                                   issue.fields.targetQuarter ||
                                   'Not Set';
              
              // Try different possible field names for to-do date
              const toDoDate = issue.fields.customfield_10003 || 
                              issue.fields['To Do Date'] || 
                              issue.fields.toDoDate ||
                              null;
              
              allEpics.push({
                key: issue.key,
                summary: issue.fields.summary,
                squad: squad.squad.name,
                status: issue.fields.status?.name || issue.fields.status?.value || 'Unknown',
                targetQuarter: targetQuarter,
                toDoDate: toDoDate
              });
            }
          });
        }
      });

      // Collect all general threads and remove duplicates
      const allGeneralThreads = [];
      const seenThreads = new Set();
      
      squadsData.forEach(squad => {
        if (squad.slackData?.generalThreads) {
          squad.slackData.generalThreads.forEach(thread => {
            const threadKey = `${thread.timestamp}-${thread.text.substring(0, 50)}`;
            if (!seenThreads.has(threadKey)) {
              seenThreads.add(threadKey);
              allGeneralThreads.push(thread);
            }
          });
        }
      });

      // Separate active and quiet squads
      const activeSquadsList = [];
      const quietSquadsList = [];
      
      squadsData.forEach(squad => {
        const issues = squad.jiraData?.issues?.length || 0;
        const decisions = squad.slackData?.decisions?.length || 0;
        const risks = squad.slackData?.risks?.length || 0;
        const threads = squad.slackData?.threads?.length || 0;
        const activity = issues + decisions + risks + threads;
        
        if (activity > 0) {
          activeSquadsList.push(`${squad.squad.name}: ${issues} issues, ${decisions} decisions, ${risks} risks, ${threads} threads`);
        } else {
          quietSquadsList.push(squad.squad.name);
        }
      });

      return `
**Aggregated Data**
• Total Jira Issues: ${totalIssues}
• Total Decisions: ${totalDecisions}
• Total Risks: ${totalRisks}
• Squad-Specific Threads: ${totalThreads}
• General Product Threads: ${allGeneralThreads.length}
• Active Squads: ${activeSquads.length}/${squadsData.length}

**Squad Breakdown**
**Active Squads:**
${activeSquadsList.length > 0 ? 
  activeSquadsList.map(squad => `• ${squad}`).join('\n') : 
  '• None'
}
**Quiet Squads:**
${quietSquadsList.length > 0 ? 
  quietSquadsList.map(squad => `• ${squad}`).join('\n') : 
  '• None'
}

**General Product Conversations:**
${allGeneralThreads.length > 0 ? 
  allGeneralThreads.map(thread => `• ${thread.text.substring(0, 100)}... (${thread.permalink})`).join('\n') : 
  'None'
}

**Active Squads Detail:**
${activeSquads.map(squad => {
  const issues = squad.jiraData?.issues || [];
  const decisions = squad.slackData?.decisions || [];
  const risks = squad.slackData?.risks || [];
  const threads = squad.slackData?.threads || [];
  
  // Identify done tickets
  const doneTickets = issues.filter(i => ['Done', 'Closed', 'Resolved'].includes(i.fields.status?.name));
  const otherTickets = issues.filter(i => !['Done', 'Closed', 'Resolved'].includes(i.fields.status?.name));
  
  return `
**${squad.squad.name}:**
• Jira Issues (${issues.length} total): ${issues.map(i => `${i.key} (${process.env.JIRA_BASE_URL}/browse/${i.key}): ${i.fields.summary} [Status: ${i.fields.status?.name || 'Unknown'}]`).join(', ') || 'None'}
• Done Tickets (${doneTickets.length}): ${doneTickets.map(i => `${i.key} (${process.env.JIRA_BASE_URL}/browse/${i.key}): ${i.fields.summary}`).join(', ') || 'None'}
• Other Active Tickets (${otherTickets.length}): ${otherTickets.map(i => `${i.key} (${process.env.JIRA_BASE_URL}/browse/${i.key}): ${i.fields.summary} [Status: ${i.fields.status?.name || 'Unknown'}]`).join(', ') || 'None'}
• Decisions: ${decisions.map(d => `${d.topic} (${d.permalink})`).join(', ') || 'None'}
• Risks: ${risks.map(r => `${r.topic} (${r.permalink})`).join(', ') || 'None'}
• Threads: ${threads.map(t => `${t.text.substring(0, 50)}... (${t.permalink})`).join(', ') || 'None'}`;
}).join('\n')}

**Epics for Gantt Chart:**
${allEpics.map(epic => `• ${epic.key} (${process.env.JIRA_BASE_URL}/browse/${epic.key}): ${epic.summary} - **${epic.squad}** - ${epic.status} - Target: ${epic.targetQuarter} - To-Do Date: ${epic.toDoDate || 'Not Set'}`).join('\n') || 'No epics found'}`;
    } else if (type === 'squad_detail') {
      const squadData = squadsData[0];
      const squad = squadData.squad;
      const issues = squadData.jiraData?.issues || [];
      const decisions = squadData.slackData?.decisions || [];
      const risks = squadData.slackData?.risks || [];
      const threads = squadData.slackData?.threads || [];
      const teamSummary = squadData.teamSummary;

      return `


**Jira Issues (${issues.length}):**
${issues.map(issue => `- ${issue.key} (${process.env.JIRA_BASE_URL}/browse/${issue.key}): ${issue.fields.summary} (${issue.fields.status.name}, ${issue.fields.assignee?.displayName || 'Unassigned'})`).join('\n') || 'None'}

**Categorization Guide:**
- **What Shipped (Done/Closed/Resolved)**: ${issues.filter(i => ['Done', 'Closed', 'Resolved'].includes(i.fields.status.name)).map(i => i.key).join(', ') || 'None'}
- **Work In Flight (All other statuses)**: ${issues.filter(i => !['Done', 'Closed', 'Resolved'].includes(i.fields.status.name)).map(i => i.key).join(', ') || 'None'}

**Slack Decisions (${decisions.length}):**
${decisions.map(decision => `- ${decision.topic} (${decision.permalink}): ${decision.decision}`).join('\n') || 'None'}

**Slack Risks (${risks.length}):**
${risks.map(risk => `- ${risk.topic} (${risk.permalink}): ${risk.description}`).join('\n') || 'None'}

**Slack Threads (${threads.length}):**
${threads.map(thread => `- ${thread.text.substring(0, 100)}... (${thread.permalink})`).join('\n') || 'None'}

**Team Summary:**
- Total Issues: ${teamSummary?.totalIssues || 0}
- Issues with Changes: ${teamSummary?.issuesWithChanges || 0}
- New Items: ${teamSummary?.newItems || 0}
- Total Changes: ${teamSummary?.totalChanges || 0}
- Status Changes: ${teamSummary?.statusChanges || 0}
- Assignee Changes: ${teamSummary?.assigneeChanges || 0}
- Story Point Changes: ${teamSummary?.storyPointChanges || 0}
- Priority Changes: ${teamSummary?.priorityChanges || 0}
- Comments: ${teamSummary?.comments || 0}

**Detailed Changelog (${teamSummary?.totalChanges || 0} total changes):**
${issues.map(issue => {
  if (issue.changeDescription) {
    return `**${issue.key}**: ${issue.changeDescription}`;
  } else if (issue.changeSummary && issue.changeSummary.changes && issue.changeSummary.changes.length > 0) {
    return `**${issue.key}**: ${issue.changeSummary.changes.map(change => 
      `${change.fieldDisplayName}: ${change.fromValue || 'empty'} → ${change.toValue || 'empty'} (${change.author}, ${change.date})`
    ).join('; ')}`;
  }
  return null;
}).filter(Boolean).join('\n') || 'No changes detected'}`;
    }
  }

  /**
   * Generate basic executive summary (fallback)
   */
  generateBasicExecutiveSummary(squadsData, dateRange, generatedTime) {
    const startDate = moment(dateRange.startDate);
    const endDate = moment(dateRange.endDate);
    
    // Aggregate data across all squads
    const totalIssues = squadsData.reduce((sum, squad) => sum + (squad.jiraData?.issues?.length || 0), 0);
    const totalDecisions = squadsData.reduce((sum, squad) => sum + (squad.slackData?.decisions?.length || 0), 0);
    const totalRisks = squadsData.reduce((sum, squad) => sum + (squad.slackData?.risks?.length || 0), 0);
    const totalThreads = squadsData.reduce((sum, squad) => sum + (squad.slackData?.threads?.length || 0), 0);
    
    // Collect all general threads from all squads
    const allGeneralThreads = squadsData.reduce((all, squad) => {
      if (squad.slackData?.generalThreads) {
        all.push(...squad.slackData.generalThreads);
      }
      return all;
    }, []);
    
    // Remove duplicates based on timestamp and text
    const uniqueGeneralThreads = allGeneralThreads.filter((thread, index, self) => 
      index === self.findIndex(t => t.timestamp === thread.timestamp && t.text === thread.text)
    );
    
    // Find squads with activity
    const activeSquads = squadsData.filter(squad => 
      (squad.jiraData?.issues?.length || 0) > 0 || 
      (squad.slackData?.decisions?.length || 0) > 0 ||
      (squad.slackData?.risks?.length || 0) > 0 ||
      (squad.slackData?.launches?.length || 0) > 0
    );

    return `# Weekly Product Digest - Executive Summary

**Date Range**: ${startDate.format('MMM DD')} to ${endDate.format('MMM DD, YYYY')}  
**Generated**: ${generatedTime}  
**Total Squads**: ${squadsData.length}  
**Active Squads**: ${activeSquads.length}

## 📊 Executive Summary

This week saw ${totalIssues} Jira issues, ${totalDecisions} decisions, ${totalRisks} risks, and ${totalThreads} squad-specific threads across ${squadsData.length} squads. ${activeSquads.length} squads had active work.

## 🎯 Key Highlights

• **Total Activity**: ${totalIssues + totalDecisions + totalRisks + totalThreads} total items
• **Active Squads**: ${activeSquads.length} out of ${squadsData.length} squads had activity
• **Focus Areas**: ${activeSquads.length > 0 ? 'Review active squad pages for details' : 'All squads quiet this week'}

## 👥 Squad Overview

${squadsData.map(squad => {
  const issues = squad.jiraData?.issues?.length || 0;
  const decisions = squad.slackData?.decisions?.length || 0;
  const risks = squad.slackData?.risks?.length || 0;
  const threads = squad.slackData?.threads?.length || 0;
  const activity = issues + decisions + risks + threads;
  
  return `### **${squad.squad.name}**
• **Jira Issues**: ${issues}
• **Decisions**: ${decisions}
• **Risks**: ${risks}
• **Threads**: ${threads}
• **Activity Level**: ${activity > 0 ? 'Active' : 'Quiet'}`;
}).join('\n\n')}

## 🔗 Cross-Squad Dependencies

${activeSquads.length > 1 ? 
  'Review individual squad pages for cross-team dependencies and coordination needs.' :
  'No cross-squad dependencies identified this week.'
}

## 📅 Epic Timeline

${(() => {
  // Collect all epics for Gantt chart
  const allEpics = [];
  squadsData.forEach(squad => {
    if (squad.jiraData?.issues) {
      squad.jiraData.issues.forEach(issue => {
        if (issue.fields.issuetype.name === 'Epic') {
          allEpics.push({
            key: issue.key,
            summary: issue.fields.summary,
            squad: squad.squad.name,
            status: issue.fields.status.name,
            targetQuarter: issue.fields.customfield_10002 || 'Not Set',
            toDoDate: issue.fields.customfield_10003 || null
          });
        }
      });
    }
  });
  
  if (allEpics.length === 0) {
    return '*No epics found for timeline view.*';
  }
  
  return allEpics.map(epic => 
    `• **${epic.key}** (${process.env.JIRA_BASE_URL}/browse/${epic.key}): ${epic.summary} - ${epic.squad} - ${epic.status} - Target: ${epic.targetQuarter}`
  ).join('\n');
})()}

## 💬 General Product Conversations

${uniqueGeneralThreads.length > 0 ? 
  uniqueGeneralThreads.map(thread => `• **${moment.unix(thread.timestamp).format('MMM DD')}**: ${thread.text.substring(0, 150)}...`).join('\n') :
  '*No general product conversations identified this week.*'
}

## 🎯 Recommended Actions

${activeSquads.length > 0 ? 
  `1. Review detailed reports for active squads: ${activeSquads.map(s => s.squad.name).join(', ')}
2. Follow up on any identified risks or blockers
3. Monitor progress on key initiatives` :
  `1. All squads were quiet this week - normal for planning periods
2. Prepare for upcoming sprint planning
3. Monitor for any delayed activity`
}`;
  }

  /**
   * Generate basic squad content (fallback)
   */
  generateBasicSquadContent(squadData, dateRange, generatedTime) {
    const squad = squadData.squad;
    const jiraData = squadData.jiraData || { issues: [] };
    const slackData = squadData.slackData || { decisions: [], risks: [], threads: [] };
    const teamSummary = squadData.teamSummary;
    const startDate = moment(dateRange.startDate);
    const endDate = moment(dateRange.endDate);
    
    // Calculate metrics
    const completedIssues = jiraData.issues.filter(issue => issue.fields.status.name === 'Done');
    const inProgressIssues = jiraData.issues.filter(issue => 
      ['In Progress', 'In Review', 'Testing'].includes(issue.fields.status.name)
    );
    const blockedIssues = jiraData.issues.filter(issue => 
      issue.fields.status.name === 'Blocked' || 
      issue.fields.priority?.name === 'High'
    );
    
    return `# ${squad.name} Weekly Digest

**Date Range**: ${startDate.format('MMM DD')} to ${endDate.format('MMM DD, YYYY')}  
**Generated**: ${generatedTime}  
**Team**: ${squad.name}

## 👥 Squad Overview

${squad.name} had ${jiraData.issues.length} Jira issues, ${slackData.decisions.length} decisions, ${slackData.risks.length} risks, and ${slackData.threads.length} threads this week.

## 📊 TL;DR

• **Accomplishment**: Completed ${completedIssues.length} issues with ${teamSummary?.activityLevel || 'No Activity'} activity level
• **Risk**: ${slackData.risks.length} potential risks identified in team discussions
• **Decision**: ${slackData.decisions.length} key decisions made this week
• **Threads**: ${slackData.threads.length} squad-specific conversations this week
• **Velocity**: ${inProgressIssues.length} items currently in progress
• **Next Week**: Focus on ${inProgressIssues.length > 0 ? 'completing in-progress items' : 'new sprint planning'}

## 🚀 What Shipped

${completedIssues.length > 0 ? 
  completedIssues.map(issue => `• **${issue.key}** (${process.env.JIRA_BASE_URL}/browse/${issue.key}) - ${issue.fields.summary} (${issue.fields.assignee?.displayName || 'Unassigned'})`).join('\n') :
  '*No issues were completed in this time period.*'
}

## 🔄 Work In Flight

${inProgressIssues.length > 0 ? 
  inProgressIssues.map(issue => `• **${issue.key}** (${process.env.JIRA_BASE_URL}/browse/${issue.key}) - ${issue.fields.summary} (${issue.fields.status.name}, ${issue.fields.assignee?.displayName || 'Unassigned'})`).join('\n') :
  '*No active work in this time period.*'
}

## ⚠️ Risks & Blockers

${blockedIssues.length > 0 ? 
  blockedIssues.map(issue => `• **${issue.key}** (${process.env.JIRA_BASE_URL}/browse/${issue.key}) - ${issue.fields.summary} - Blocked by ${issue.fields.status.name} (${issue.fields.assignee?.displayName || 'Unassigned'})`).join('\n') :
  '*No significant risks or blockers identified.*'
}

## 💡 Decisions

${slackData.decisions.length > 0 ? 
  slackData.decisions.map(decision => `• **${decision.topic}** (${decision.permalink}) - ${decision.decision}`).join('\n') :
  '*No key decisions documented this week.*'
}

## 💬 Squad Threads

${slackData.threads.length > 0 ? 
  slackData.threads.map(thread => `• **${moment.unix(thread.timestamp).format('MMM DD')}** (${thread.permalink}): ${thread.text.substring(0, 100)}...`).join('\n') :
  '*No squad-specific conversations this week.*'
}

## 📈 Team Summary

### Activity Overview
• **Total Issues**: ${teamSummary?.totalIssues || 0}
• **Issues with Changes**: ${teamSummary?.issuesWithChanges || 0}
• **New Items**: ${teamSummary?.newItems || 0}
• **Total Changes**: ${teamSummary?.totalChanges || 0}
• **Activity Level**: ${teamSummary?.activityLevel || 'No Activity'}

### Change Breakdown
• **Status Changes**: ${teamSummary?.statusChanges || 0}
• **Assignee Changes**: ${teamSummary?.assigneeChanges || 0}
• **Story Point Changes**: ${teamSummary?.storyPointChanges || 0}
• **Priority Changes**: ${teamSummary?.priorityChanges || 0}
• **Comments**: ${teamSummary?.comments || 0}

## 🎯 Next Week's Focus

${inProgressIssues.length > 0 ? 
  `1. Complete in-progress items: ${inProgressIssues.map(i => i.key).join(', ')}
2. Address any blockers or risks
3. Plan next sprint priorities` :
  `1. Prepare for upcoming sprint planning
2. Review backlog and priorities
3. Coordinate with other teams as needed`
}`;
  }

  /**
   * Convert markdown to Notion blocks with proper formatting
   */
  convertMarkdownToNotionBlocks(markdown) {
    // Clean up markdown artifacts
    let cleanedMarkdown = markdown
      .replace(/^```markdown\s*/g, '') // Remove opening markdown code block
      .replace(/\s*```\s*$/g, '') // Remove closing code block
      .replace(/\*\*(?!\w)/g, '') // Remove stray ** at end of words
      .replace(/(?<!\w)\*\*/g, '') // Remove stray ** at beginning of words
      .replace(/\*\*(?!\w)/g, '') // Remove any remaining stray **
      .replace(/\*\*(?!\w)/g, ''); // Double-check for any remaining
    
    const lines = cleanedMarkdown.split('\n');
    const blocks = [];
    let currentBlock = null;
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        // H1 heading
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = {
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [{ type: 'text', text: { content: line.substring(2) } }]
          }
        };
      } else if (line.startsWith('## ')) {
        // H2 heading
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: line.substring(3) } }]
          }
        };
      } else if (line.startsWith('### ')) {
        // H3 heading
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = {
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: line.substring(4) } }]
          }
        };
      } else if (line.startsWith('• ')) {
        // Bullet point with rich text formatting
        if (currentBlock) blocks.push(currentBlock);
        const bulletText = line.substring(2);
        const richText = this.parseRichText(bulletText);
        currentBlock = {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: richText
          }
        };
      } else if (line.includes('do an embed of this link') && line.includes('[') && line.includes(']')) {
        // Rich text link - extract URL from [url] format
        if (currentBlock) blocks.push(currentBlock);
        const urlMatch = line.match(/\[([^\]]+)\]/);
        if (urlMatch) {
          const url = urlMatch[1];
          currentBlock = {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: 'Epic Timeline & Strategic Initiatives',
                    link: {
                      url: url
                    }
                  }
                }
              ]
            }
          };
        } else {
          // Fallback to paragraph if URL extraction fails
          const richText = this.parseRichText(line);
          currentBlock = {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: richText
            }
          };
        }
      } else if (line.trim() === '') {
        // Empty line
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
      } else {
        // Regular paragraph with rich text formatting
        if (currentBlock) blocks.push(currentBlock);
        const richText = this.parseRichText(line);
        currentBlock = {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: richText
          }
        };
      }
    }
    
    if (currentBlock) {
      blocks.push(currentBlock);
    }
    
    return blocks;
  }

  /**
   * Final cleanup: Remove any duplicate Squad Pages sections
   */
  async cleanupDuplicateSquadPages(pageId) {
    try {
      logger.info('Starting cleanupDuplicateSquadPages', { pageId: pageId });
      
      // Get the current page blocks
      const response = await this.client.blocks.children.list({
        block_id: pageId,
      });
      
      const blocks = response.results;
      logger.info('Retrieved blocks for cleanup', { 
        pageId: pageId,
        totalBlocks: blocks.length 
      });
      
      // Find all Squad Pages sections and their content
      const squadPagesSections = [];
      let currentSection = null;
      
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        
        if (block.type === 'heading_2' && 
            block.heading_2.rich_text.length > 0 &&
            block.heading_2.rich_text[0].plain_text.includes('Squad Pages')) {
          
          logger.info('Found Squad Pages heading', { 
            pageId: pageId,
            index: i,
            headingText: block.heading_2.rich_text[0].plain_text
          });
          
          // If we already have a section, close it
          if (currentSection) {
            currentSection.endIndex = i - 1;
            squadPagesSections.push(currentSection);
            logger.info('Closed previous section', { 
              pageId: pageId,
              sectionStart: currentSection.startIndex,
              sectionEnd: currentSection.endIndex
            });
          }
          
          // Start new section
          currentSection = { startIndex: i, block: block };
          logger.info('Started new section', { 
            pageId: pageId,
            sectionStart: i
          });
        }
      }
      
      // Close the last section
      if (currentSection) {
        currentSection.endIndex = blocks.length - 1;
        squadPagesSections.push(currentSection);
        logger.info('Closed final section', { 
          pageId: pageId,
          sectionStart: currentSection.startIndex,
          sectionEnd: currentSection.endIndex
        });
      }
      
      logger.info('Squad Pages sections found', { 
        pageId: pageId,
        totalSections: squadPagesSections.length,
        sections: squadPagesSections.map((s, i) => ({
          index: i,
          start: s.startIndex,
          end: s.endIndex,
          length: s.endIndex - s.startIndex + 1
        }))
      });
      
      // If we have more than one Squad Pages section, remove the one with wrong URL format
      if (squadPagesSections.length > 1) {
        logger.info('Found duplicate Squad Pages sections, analyzing content', { 
          pageId: pageId,
          totalSections: squadPagesSections.length 
        });
        
        // Find the section with the wrong URL format (no dashes in page IDs)
        let sectionToRemove = null;
        for (const section of squadPagesSections) {
          let hasWrongFormat = false;
          
          logger.info('Analyzing section', { 
            pageId: pageId,
            sectionIndex: squadPagesSections.indexOf(section),
            sectionStart: section.startIndex,
            sectionEnd: section.endIndex
          });
          
          // Check the content of this section for wrong URL format
          for (let i = section.startIndex; i <= section.endIndex; i++) {
            const block = blocks[i];
            if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
              const text = block.paragraph.rich_text[0].plain_text;
              
              // Debug logging
              if (text.includes('notion.so')) {
                logger.info('Found Notion URL in section', { 
                  text: text.substring(0, 100),
                  sectionIndex: squadPagesSections.indexOf(section),
                  blockIndex: i
                });
              }
              
              // Look for URLs with page IDs that don't have dashes (wrong format)
              // The wrong format has: 24cf43a78fa48169b15ff60290a88e7d (no dashes)
              // The correct format has: 24cf43a7-8fa4-8169-b15f-f60290a88e7d (with dashes)
              if (text.includes('notion.so') && text.includes('24cf43a78fa4') && 
                  text.match(/24cf43a78fa4[0-9a-f]{16}\?pvs=21/)) {
                hasWrongFormat = true;
                logger.info('Found wrong format URL', { 
                  text: text.substring(0, 100),
                  sectionIndex: squadPagesSections.indexOf(section),
                  blockIndex: i
                });
                break;
              }
            }
          }
          
          if (hasWrongFormat) {
            sectionToRemove = section;
            logger.info('Identified section to remove', { 
              pageId: pageId,
              sectionIndex: squadPagesSections.indexOf(section),
              sectionStart: section.startIndex,
              sectionEnd: section.endIndex
            });
            break;
          }
        }
        
        if (sectionToRemove) {
          logger.info('Found section with wrong URL format, removing it', { 
            pageId: pageId,
            sectionStart: sectionToRemove.startIndex,
            sectionEnd: sectionToRemove.endIndex
          });
          
          // Delete the blocks in reverse order to maintain indices
          for (let i = sectionToRemove.endIndex; i >= sectionToRemove.startIndex; i--) {
            logger.info('Deleting block during cleanup', { 
              pageId: pageId,
              blockIndex: i,
              blockId: blocks[i].id,
              blockType: blocks[i].type
            });
            await this.client.blocks.delete({
              block_id: blocks[i].id,
            });
          }
          
          logger.info('Successfully removed section with wrong URL format', { 
            pageId: pageId,
            deletedBlocks: sectionToRemove.endIndex - sectionToRemove.startIndex + 1
          });
        } else {
          logger.warn('No section with wrong URL format found to remove', { pageId: pageId });
        }
      } else {
        logger.info('No duplicate sections found, cleanup not needed', { 
          pageId: pageId,
          totalSections: squadPagesSections.length
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup duplicate Squad Pages sections', { 
        error: error.message,
        pageId: pageId,
        stack: error.stack
      });
    }
  }

  /**
   * Replace the placeholder text with real Squad Pages links
   */
  async replacePlaceholderWithSquadPages(pageId, squadPagesBlocks) {
    try {
      logger.info('Starting replacePlaceholderWithSquadPages', { 
        pageId: pageId,
        squadPagesBlocksCount: squadPagesBlocks.length 
      });
      
      // Get the current page blocks
      const response = await this.client.blocks.children.list({
        block_id: pageId,
      });
      
      const blocks = response.results;
      logger.info('Current page blocks retrieved', { 
        pageId: pageId,
        totalBlocks: blocks.length 
      });
      
      // Find the placeholder text block
      let placeholderIndex = -1;
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === 'paragraph' && 
            block.paragraph.rich_text.length > 0 &&
            block.paragraph.rich_text[0].plain_text.includes('This section will be populated automatically')) {
          placeholderIndex = i;
          logger.info('Found placeholder text at index', { 
            pageId: pageId,
            placeholderIndex: i,
            placeholderText: block.paragraph.rich_text[0].plain_text.substring(0, 100)
          });
          break;
        }
      }
      
      if (placeholderIndex !== -1) {
        logger.info('Deleting placeholder block', { 
          pageId: pageId,
          placeholderIndex: placeholderIndex,
          blockId: blocks[placeholderIndex].id
        });
        
        // Delete the placeholder text block
        await this.client.blocks.delete({
          block_id: blocks[placeholderIndex].id,
        });
        
        logger.info('Appending Squad Pages blocks after placeholder deletion', { 
          pageId: pageId,
          blocksToAppend: squadPagesBlocks.length
        });
        
        // Insert the real Squad Pages content at the same position
        await this.client.blocks.children.append({
          block_id: pageId,
          children: squadPagesBlocks,
        });
        
        logger.info('Successfully replaced placeholder text with Squad Pages links', { 
          pageId: pageId,
          placeholderIndex: placeholderIndex 
        });
      } else {
        logger.warn('Placeholder text not found, searching for existing Squad Pages section', { pageId: pageId });
        
        // If placeholder not found, look for any existing Squad Pages section and replace it
        let existingSectionStart = -1;
        let existingSectionEnd = -1;
        
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];
          if (block.type === 'heading_2' && 
              block.heading_2.rich_text.length > 0 &&
              block.heading_2.rich_text[0].plain_text.includes('Squad Pages')) {
            existingSectionStart = i;
            logger.info('Found existing Squad Pages section at index', { 
              pageId: pageId,
              sectionStart: i,
              headingText: block.heading_2.rich_text[0].plain_text
            });
            
            // Find the end of this section (next heading or end of blocks)
            for (let j = i + 1; j < blocks.length; j++) {
              if (blocks[j].type === 'heading_1' || blocks[j].type === 'heading_2') {
                existingSectionEnd = j - 1;
                break;
              }
            }
            if (existingSectionEnd === -1) {
              existingSectionEnd = blocks.length - 1;
            }
            
            logger.info('Existing Squad Pages section boundaries', { 
              pageId: pageId,
              sectionStart: existingSectionStart,
              sectionEnd: existingSectionEnd,
              sectionLength: existingSectionEnd - existingSectionStart + 1
            });
            break;
          }
        }
        
        if (existingSectionStart !== -1) {
          logger.info('Deleting existing Squad Pages section', { 
            pageId: pageId,
            sectionStart: existingSectionStart,
            sectionEnd: existingSectionEnd
          });
          
          // Delete the existing section
          for (let i = existingSectionEnd; i >= existingSectionStart; i--) {
            logger.info('Deleting block', { 
              pageId: pageId,
              blockIndex: i,
              blockId: blocks[i].id,
              blockType: blocks[i].type
            });
            await this.client.blocks.delete({
              block_id: blocks[i].id,
            });
          }
          
          logger.info('Appending new Squad Pages content after section deletion', { 
            pageId: pageId,
            blocksToAppend: squadPagesBlocks.length
          });
          
          // Insert the new content at the same position
          await this.client.blocks.children.append({
            block_id: pageId,
            children: squadPagesBlocks,
          });
          
          logger.info('Successfully replaced existing Squad Pages section with new content', { 
            pageId: pageId,
            sectionStart: existingSectionStart,
            sectionEnd: existingSectionEnd
          });
        } else {
          // No existing section found, append at the end
          logger.warn('No placeholder or existing Squad Pages section found, appending at the end', { 
            pageId: pageId,
            totalBlocks: blocks.length
          });
          await this.appendBlocksInChunks(pageId, squadPagesBlocks);
        }
      }
    } catch (error) {
      logger.error('Failed to replace placeholder with Squad Pages', { 
        error: error.message,
        pageId: pageId,
        stack: error.stack
      });
      // Don't fallback to appending at the end to avoid duplicates
    }
  }

  /**
   * Append blocks to a page in chunks to avoid the 100-block limit
   */
  async appendBlocksInChunks(pageId, blocks) {
    const chunkSize = 95; // Stay under the 100-block limit
    
    for (let i = 0; i < blocks.length; i += chunkSize) {
      const chunk = blocks.slice(i, i + chunkSize);
      
      try {
        await this.client.blocks.children.append({
          block_id: pageId,
          children: chunk
        });
        
        logger.info('Appended block chunk', { 
          chunkIndex: Math.floor(i / chunkSize) + 1,
          chunkSize: chunk.length,
          totalBlocks: blocks.length
        });
        
        // Small delay to avoid rate limiting
        if (i + chunkSize < blocks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        logger.error('Failed to append block chunk', { 
          chunkIndex: Math.floor(i / chunkSize) + 1,
          error: error.message 
        });
        throw error;
      }
    }
  }

  /**
   * Parse text with markdown formatting into Notion rich text
   */
  parseRichText(text) {
    const richText = [];
    let currentText = '';
    let currentAnnotations = { bold: false, italic: false };
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '*' && nextChar === '*') {
        // Bold formatting
        if (currentText) {
          richText.push({
            type: 'text',
            text: { content: currentText },
            annotations: { ...currentAnnotations }
          });
          currentText = '';
        }
        currentAnnotations.bold = !currentAnnotations.bold;
        i++; // Skip next character
      } else if (char === '*' && !nextChar) {
        // Single asterisk at end - treat as literal
        currentText += char;
      } else if (char === '*' && nextChar !== '*') {
        // Italic formatting
        if (currentText) {
          richText.push({
            type: 'text',
            text: { content: currentText },
            annotations: { ...currentAnnotations }
          });
          currentText = '';
        }
        currentAnnotations.italic = !currentAnnotations.italic;
      } else {
        currentText += char;
      }
    }
    
    // Add remaining text
    if (currentText) {
      richText.push({
        type: 'text',
        text: { content: currentText },
        annotations: { ...currentAnnotations }
      });
    }
    
    return richText.length > 0 ? richText : [{ type: 'text', text: { content: text } }];
  }
}

module.exports = { NotionPublisher };
