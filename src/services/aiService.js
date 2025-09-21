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

For each squad that shipped work, provide a brief summary of what was accomplished. Focus on:
- Key technical achievements
- Business impact
- Notable features or improvements

Here's the shipped work data:

`;

    shippedWorkData.forEach(squad => {
      prompt += `\n## ${squad.squadName}:\n`;
      
      squad.tickets.forEach(ticket => {
        prompt += `- ${ticket.key}: ${ticket.summary}\n`;
        if (ticket.description && ticket.description !== 'No description available') {
          prompt += `  Description: ${ticket.description.substring(0, 200)}${ticket.description.length > 200 ? '...' : ''}\n`;
        }
      });
      prompt += '\n';
    });

    prompt += `\nPlease generate a summary that includes:
1. For each squad that shipped work, a brief summary of their key accomplishments
2. Focus on business impact and technical achievements
3. Keep it very concise - aim for 2-3 sentences per squad maximum
4. Use professional, executive-friendly language
5. Add a line break before starting to discuss each new squad (except the first one)
6. Total response should be under 1800 characters to fit Notion limits
7. Do NOT add any concluding statements or overall summary paragraphs at the end

Format the response as flowing text with line breaks separating different squad discussions. End immediately after describing the last squad's work.`;

    return prompt;
  }

  /**
   * Generate fallback summary when AI fails
   */
  generateFallbackSummary(organizedData, metrics) {
    const squadsWithActivity = Object.entries(metrics).filter(([_, squad]) => squad.done > 0);
    
    let summary = '';
    
    if (squadsWithActivity.length > 0) {
      const topSquads = squadsWithActivity
        .sort(([_, a], [__, b]) => b.done - a.done)
        .slice(0, 3);
      
      summary += `Key deliveries this week: `;
      topSquads.forEach(([squadName, squad], index) => {
        summary += `${squadName} delivered key functionality`;
        if (index < topSquads.length - 1) {
          summary += ', ';
        } else {
          summary += '. ';
        }
      });
    } else {
      summary = 'No major deliveries were completed this week.';
    }

    return summary;
  }
}

module.exports = new AIService();
