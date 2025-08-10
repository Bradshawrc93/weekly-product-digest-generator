const { logger } = require('../utils/logger');
const OpenAI = require('openai');
const moment = require('moment');

class AIGenerator {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 2000;
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3;
  }

  async generateSquadSummary(data) {
    const { squad, processedData, dateRange } = data;
    
    logger.logSquad('info', 'Generating AI summary', squad.name);
    
    try {
      const prompt = this.buildSquadPrompt(squad, processedData, dateRange);
      const response = await this.generateContent(prompt);
      
      return this.parseSquadResponse(response, squad, processedData);
    } catch (error) {
      logger.logSquad('error', 'Failed to generate AI summary', squad.name, { error: error.message });
      throw error;
    }
  }

  async generateRollupSummary(rollupData, dateRange) {
    logger.info('Generating rollup summary');
    
    try {
      const prompt = this.buildRollupPrompt(rollupData, dateRange);
      const response = await this.generateContent(prompt);
      
      return this.parseRollupResponse(response, rollupData);
    } catch (error) {
      logger.error('Failed to generate rollup summary', { error: error.message });
      throw error;
    }
  }

  buildSquadPrompt(squad, processedData, dateRange) {
    const { insights, crossLinkedData } = processedData;
    const weekRange = `${dateRange.startDate.format('MMM D')} - ${dateRange.endDate.format('MMM D, YYYY')}`;
    
    // Build data summary
    const jiraMovements = this.buildJiraMovements(crossLinkedData.issues);
    const notablePRs = this.buildNotablePRs(crossLinkedData.prs);
    const slackDecisions = this.buildSlackDecisions(crossLinkedData.decisions);
    const risksIdentified = this.buildRisksIdentified(insights.risks);
    
    return `You are generating a weekly product digest for the ${squad.name} team.

Context:
- Squad members: ${squad.members.map(m => m.fullName).join(', ')}
- Roadmap: ${squad.notionRoadmapUrl || 'Not configured'}
- Week: ${weekRange}

Data Summary:
${jiraMovements}

${notablePRs}

${slackDecisions}

${risksIdentified}

Velocity Metrics:
- Planned story points: ${insights.velocity.plannedPoints}
- Completed story points: ${insights.velocity.completedPoints}
- Velocity: ${(insights.velocity.velocity * 100).toFixed(1)}%
- Trend: ${insights.velocity.trend}

Generate a structured digest with the following sections:

1. TL;DR (max 5 bullets) - Key highlights and achievements
2. What Shipped - Completed work with links to PRs and issues
3. Work in Flight - Active development items and their status
4. Risks & Blockers - Identified issues and concerns with severity
5. Decisions - Key decisions from Slack discussions with impact
6. Roadmap Snapshot - Open epics by target quarter with progress

Tone: Professional, data-driven, actionable
Format: Use bullet points for lists, include specific issue keys and PR numbers where relevant
Length: Keep each section concise but informative`;
  }

  buildJiraMovements(issues) {
    const completedIssues = issues.filter(issue => 
      ['Done', 'Closed', 'Resolved'].includes(issue.status)
    );
    const inProgressIssues = issues.filter(issue => 
      ['In Progress', 'In Review', 'Testing'].includes(issue.status)
    );
    
    let summary = `Jira Movements (${issues.length} total issues):\n`;
    
    if (completedIssues.length > 0) {
      summary += `- Completed: ${completedIssues.length} issues\n`;
      completedIssues.slice(0, 5).forEach(issue => {
        summary += `  • ${issue.key}: ${issue.title}\n`;
      });
    }
    
    if (inProgressIssues.length > 0) {
      summary += `- In Progress: ${inProgressIssues.length} issues\n`;
      inProgressIssues.slice(0, 5).forEach(issue => {
        summary += `  • ${issue.key}: ${issue.title}\n`;
      });
    }
    
    return summary;
  }

  buildNotablePRs(prs) {
    const mergedPRs = prs.filter(pr => pr.merged);
    
    let summary = `Notable PRs (${prs.length} total, ${mergedPRs.length} merged):\n`;
    
    if (mergedPRs.length > 0) {
      mergedPRs.slice(0, 5).forEach(pr => {
        summary += `- #${pr.number}: ${pr.title} (${pr.author})\n`;
        if (pr.linkedIssues.length > 0) {
          summary += `  Linked issues: ${pr.linkedIssues.join(', ')}\n`;
        }
      });
    }
    
    return summary;
  }

  buildSlackDecisions(decisions) {
    let summary = `Slack Decisions (${decisions.length} total):\n`;
    
    if (decisions.length > 0) {
      decisions.slice(0, 5).forEach(decision => {
        summary += `- ${decision.text.substring(0, 100)}... (${decision.author})\n`;
        if (decision.linkedIssues.length > 0) {
          summary += `  Related issues: ${decision.linkedIssues.map(i => i.key).join(', ')}\n`;
        }
      });
    }
    
    return summary;
  }

  buildRisksIdentified(risks) {
    let summary = `Risks Identified (${risks.totalRisks} total):\n`;
    
    if (risks.highRiskEpics.length > 0) {
      summary += `- High-risk epics: ${risks.highRiskEpics.join(', ')}\n`;
    }
    
    if (Object.keys(risks.riskBreakdown).length > 0) {
      summary += `- Risk breakdown:\n`;
      Object.entries(risks.riskBreakdown).forEach(([factor, count]) => {
        summary += `  • ${factor}: ${count} issues\n`;
      });
    }
    
    return summary;
  }

  buildRollupPrompt(rollupData, dateRange) {
    const weekRange = `${dateRange.startDate.format('MMM D')} - ${dateRange.endDate.format('MMM D, YYYY')}`;
    
    let summary = `Generate an executive roll-up summary for all squads.

Week: ${weekRange}
Total Squads: ${rollupData.totalSquads}

Squad Summaries:
${rollupData.squadSummaries.map(squad => 
  `- ${squad.name}: ${squad.issues} issues, ${squad.prs} PRs, ${squad.decisions} decisions, ${(squad.velocity * 100).toFixed(1)}% velocity, ${(squad.riskScore * 100).toFixed(1)}% risk score`
).join('\n')}

Company Metrics:
- Total Issues: ${rollupData.companyMetrics.totalIssues}
- Total PRs: ${rollupData.companyMetrics.totalPRs}
- Total Decisions: ${rollupData.companyMetrics.totalDecisions}
- Average Velocity: ${(rollupData.companyMetrics.averageVelocity * 100).toFixed(1)}%
- Average Risk Score: ${(rollupData.companyMetrics.averageRiskScore * 100).toFixed(1)}%

Generate a high-level summary with:

1. Key Highlights - Most important achievements and milestones
2. Cross-Squad Dependencies - Any interdependencies or shared work
3. Company-wide Metrics - Overall performance and trends
4. Strategic Insights - High-level observations and recommendations

Tone: Executive-level, strategic, actionable
Format: Use bullet points, focus on business impact
Length: Keep concise but comprehensive`;

    return summary;
  }

  async generateContent(prompt) {
    logger.debug('Generating AI content', { promptLength: prompt.length });
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a product operations expert who generates clear, actionable weekly digests. Focus on data-driven insights and practical recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const content = response.choices[0].message.content;
      const usage = response.usage;

      logger.debug('AI content generated successfully', { 
        tokensUsed: usage.total_tokens,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens
      });

      return {
        content,
        usage
      };
    } catch (error) {
      logger.error('Failed to generate AI content', { 
        error: error.message,
        model: this.model,
        promptLength: prompt.length
      });
      throw error;
    }
  }

  parseSquadResponse(response, squad, processedData) {
    const content = response.content;
    
    // Parse the structured response
    const sections = this.parseStructuredContent(content);
    
    // Validate required sections
    const requiredSections = ['TL;DR', 'What Shipped', 'Work in Flight', 'Risks & Blockers', 'Decisions', 'Roadmap Snapshot'];
    const missingSections = requiredSections.filter(section => !sections[section]);
    
    if (missingSections.length > 0) {
      logger.logSquad('warn', 'Missing required sections in AI response', squad.name, { missingSections });
    }
    
    return {
      tldr: sections['TL;DR'] || ['No TL;DR generated'],
      shipped: sections['What Shipped'] || ['No shipped items listed'],
      inFlight: sections['Work in Flight'] || ['No in-flight work listed'],
      risks: sections['Risks & Blockers'] || ['No risks identified'],
      decisions: sections['Decisions'] || ['No decisions captured'],
      roadmap: sections['Roadmap Snapshot'] || 'No roadmap snapshot provided',
      rawContent: content,
      metadata: {
        squad: squad.name,
        generatedAt: new Date().toISOString(),
        model: this.model,
        tokensUsed: response.usage.total_tokens
      }
    };
  }

  parseRollupResponse(response, rollupData) {
    const content = response.content;
    
    // Parse the structured response
    const sections = this.parseStructuredContent(content);
    
    return {
      highlights: sections['Key Highlights'] || ['No highlights generated'],
      dependencies: sections['Cross-Squad Dependencies'] || ['No dependencies identified'],
      metrics: sections['Company-wide Metrics'] || ['No metrics provided'],
      insights: sections['Strategic Insights'] || ['No strategic insights provided'],
      rawContent: content,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: this.model,
        tokensUsed: response.usage.total_tokens,
        squadCount: rollupData.totalSquads
      }
    };
  }

  parseStructuredContent(content) {
    const sections = {};
    const lines = content.split('\n');
    let currentSection = null;
    let currentContent = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for section headers
      if (trimmedLine.match(/^\d+\.\s+[A-Z][a-zA-Z\s&]+$/) || 
          trimmedLine.match(/^[A-Z][a-zA-Z\s&]+:$/)) {
        
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent;
        }
        
        // Start new section
        currentSection = trimmedLine.replace(/^\d+\.\s+/, '').replace(':', '');
        currentContent = [];
      } else if (currentSection && trimmedLine.length > 0) {
        // Add content to current section
        currentContent.push(trimmedLine);
      }
    }
    
    // Save last section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent;
    }
    
    return sections;
  }
}

module.exports = { AIGenerator };
