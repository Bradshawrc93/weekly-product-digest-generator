const OpenAI = require('openai');
const config = require('../utils/config');
const { logger } = require('../utils/logger');

class AIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate AI summary of shipped work by squad
   */
  async generateShippedWorkSummary(organizedData, metrics) {
    try {
      // Prepare data for AI analysis
      const shippedWorkData = this.prepareShippedWorkData(organizedData, metrics);
      
      if (shippedWorkData.length === 0) {
        return "No work was shipped this week.";
      }

      const prompt = this.buildShippedWorkPrompt(shippedWorkData);
      
      logger.info('Generating AI summary for shipped work', {
        squadsWithShippedWork: shippedWorkData.length,
        totalTickets: shippedWorkData.reduce((sum, squad) => sum + squad.tickets.length, 0)
      });

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a product operations analyst. Generate concise, professional summaries of engineering work completed. Focus on business impact and technical achievements. Use clear, executive-friendly language."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const summary = response.choices[0].message.content.trim();
      
      logger.info('AI summary generated successfully', {
        summaryLength: summary.length,
        squadsAnalyzed: shippedWorkData.length
      });

      return summary;
    } catch (error) {
      logger.error('Failed to generate AI summary', { 
        error: error.message,
        squadsCount: Object.keys(organizedData).length 
      });
      
      // Fallback to basic summary
      return this.generateFallbackSummary(organizedData, metrics);
    }
  }

  /**
   * Prepare shipped work data for AI analysis
   */
  prepareShippedWorkData(organizedData, metrics) {
    const shippedWorkData = [];

    Object.entries(organizedData).forEach(([squadName, squadData]) => {
      const squadMetrics = metrics[squadName];
      
      if (squadMetrics && squadMetrics.done > 0 && squadData.completedTickets) {
        const tickets = squadData.completedTickets.map(ticket => ({
          key: ticket.key,
          summary: ticket.summary,
          description: ticket.description || 'No description available',
          priority: ticket.priority,
          assignee: ticket.assignee
        }));

        shippedWorkData.push({
          squadName,
          ticketCount: squadMetrics.done,
          tickets
        });
      }
    });

    // Sort by ticket count (most active squads first)
    return shippedWorkData.sort((a, b) => b.ticketCount - a.ticketCount);
  }

  /**
   * Build prompt for AI analysis
   */
  buildShippedWorkPrompt(shippedWorkData) {
    let prompt = `Analyze the following engineering work completed this week and generate a professional summary.

Current week's story: We shipped ${shippedWorkData.reduce((sum, squad) => sum + squad.ticketCount, 0)} key deliverables.

For each squad that shipped work, provide a brief summary of what was accomplished. Focus on:
- Key technical achievements
- Business impact
- Notable features or improvements

Here's the shipped work data:

`;

    shippedWorkData.forEach(squad => {
      prompt += `\n## ${squad.squadName} (${squad.ticketCount} items shipped):\n`;
      
      squad.tickets.forEach(ticket => {
        prompt += `- ${ticket.key}: ${ticket.summary}\n`;
        if (ticket.description && ticket.description !== 'No description available') {
          prompt += `  Description: ${ticket.description.substring(0, 200)}${ticket.description.length > 200 ? '...' : ''}\n`;
        }
      });
      prompt += '\n';
    });

    prompt += `\nPlease generate a summary that includes:
1. The overall story: "This week's story: We shipped X key deliverables"
2. For each squad that shipped work, a brief summary of their key accomplishments
3. Focus on business impact and technical achievements
4. Keep it concise but informative
5. Use professional, executive-friendly language

Format the response as a single paragraph that flows naturally.`;

    return prompt;
  }

  /**
   * Generate fallback summary when AI fails
   */
  generateFallbackSummary(organizedData, metrics) {
    const totalDone = Object.values(metrics).reduce((sum, squad) => sum + squad.done, 0);
    const totalCreated = Object.values(metrics).reduce((sum, squad) => sum + squad.created, 0);
    
    let summary = `This week's story: We shipped ${totalDone} key deliverables`;
    if (totalCreated > 0) {
      summary += ` while creating ${totalCreated} new work items`;
    }
    summary += `. `;

    const squadsWithActivity = Object.entries(metrics).filter(([_, squad]) => squad.done > 0);
    
    if (squadsWithActivity.length > 0) {
      const topSquads = squadsWithActivity
        .sort(([_, a], [__, b]) => b.done - a.done)
        .slice(0, 3);
      
      summary += `Key deliveries: `;
      topSquads.forEach(([squadName, squad], index) => {
        summary += `${squadName} delivered ${squad.done} items`;
        if (index < topSquads.length - 1) {
          summary += ', ';
        } else {
          summary += '. ';
        }
      });
    }

    return summary;
  }
}

module.exports = new AIService();
