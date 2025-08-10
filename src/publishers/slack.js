const { logger } = require('../utils/logger');
const { WebClient } = require('@slack/web-api');
const moment = require('moment');

class SlackNotifier {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  async sendDigestNotification(data) {
    const { results, dateRange, globalSettings } = data;
    
    logger.info('Sending digest notification to Slack');
    
    try {
      const message = this.buildNotificationMessage(results, dateRange, globalSettings);
      await this.postMessage(message);
      
      logger.info('Digest notification sent successfully');
    } catch (error) {
      logger.error('Failed to send digest notification', { error: error.message });
      throw error;
    }
  }

  buildNotificationMessage(results, dateRange, globalSettings) {
    const channel = globalSettings.notifications?.slackChannel || '#product';
    const weekRange = `${dateRange.startDate.format('MMM D')} - ${dateRange.endDate.format('MMM D, YYYY')}`;
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 Weekly Product Digest - ${weekRange}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: this.buildSummaryText(results)
        }
      }
    ];

    // Add squad links
    if (results.generatedDigests.length > 0) {
      const squadLinks = results.generatedDigests
        .filter(digest => digest.notionPageId)
        .map(digest => `• ${digest.squad}: <https://notion.so/${digest.notionPageId.replace(/-/g, '')}|View Digest>`)
        .join('\n');

      if (squadLinks) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Squad Digests:*\n${squadLinks}`
          }
        });
      }
    }

    // Add executive rollup link
    if (results.executiveRollup?.notionPageId) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Executive Summary:* <https://notion.so/${results.executiveRollup.notionPageId.replace(/-/g, '')}|View Rollup>`
        }
      });
    }

    // Add metrics summary
    const metricsText = this.buildMetricsText(results);
    if (metricsText) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: metricsText
        }
      });
    }

    // Add action buttons
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View All Digests'
          },
          url: `https://notion.so/${globalSettings.outputNotionDatabaseId.replace(/-/g, '')}`,
          style: 'primary'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Generate New Digest'
          },
          action_id: 'generate_digest',
          style: 'secondary'
        }
      ]
    });

    return {
      channel,
      blocks,
      text: `Weekly Product Digest for ${weekRange}`
    };
  }

  buildSummaryText(results) {
    const { summary } = results;
    
    let text = `*Summary:*\n`;
    text += `• ${summary.successfulDigests} squads processed successfully\n`;
    text += `• ${summary.totalIssues} Jira issues tracked\n`;
    text += `• ${summary.totalPRs} pull requests merged\n`;
    text += `• ${summary.totalDecisions} decisions captured\n\n`;
    
    if (summary.failedDigests > 0) {
      text += `⚠️ ${summary.failedDigests} squads failed to process\n`;
    } else {
      text += `✅ All squads processed successfully\n`;
    }
    
    return text;
  }

  buildMetricsText(results) {
    if (results.generatedDigests.length === 0) return null;
    
    const avgVelocity = results.generatedDigests.reduce((sum, digest) => 
      sum + (digest.insights?.velocity?.velocity || 0), 0
    ) / results.generatedDigests.length;
    
    const totalRisks = results.generatedDigests.reduce((sum, digest) => 
      sum + (digest.insights?.risks?.totalRisks || 0), 0
    );
    
    let text = `*Key Metrics:*\n`;
    text += `• Average Velocity: ${(avgVelocity * 100).toFixed(1)}%\n`;
    text += `• Total Risks: ${totalRisks}\n`;
    text += `• Completion Rate: ${this.calculateCompletionRate(results)}%\n`;
    
    return text;
  }

  calculateCompletionRate(results) {
    const totalCompleted = results.generatedDigests.reduce((sum, digest) => 
      sum + (digest.insights?.velocity?.completedIssues || 0), 0
    );
    
    const totalPlanned = results.generatedDigests.reduce((sum, digest) => 
      sum + (digest.insights?.velocity?.plannedIssues || 0), 0
    );
    
    if (totalPlanned === 0) return 0;
    return Math.round((totalCompleted / totalPlanned) * 100);
  }

  async postMessage(message) {
    logger.debug('Posting message to Slack', { channel: message.channel });
    
    try {
      const response = await this.client.chat.postMessage({
        channel: message.channel,
        text: message.text,
        blocks: message.blocks,
        unfurl_links: false,
        unfurl_media: false
      });
      
      logger.info('Slack message posted successfully', { 
        channel: message.channel,
        messageTs: response.ts,
        blockCount: message.blocks.length
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to post Slack message', { 
        channel: message.channel,
        error: error.message 
      });
      throw error;
    }
  }

  async sendErrorNotification(error, context) {
    logger.error('Sending error notification', { error: error.message, context });
    
    try {
      const errorMessage = this.buildErrorMessage(error, context);
      await this.postMessage(errorMessage);
      
      logger.info('Error notification sent successfully');
    } catch (notifyError) {
      logger.error('Failed to send error notification', { 
        originalError: error.message,
        notifyError: notifyError.message 
      });
    }
  }

  buildErrorMessage(error, context) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Weekly Digest Generation Failed'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error:* ${error.message}\n*Context:* ${context || 'Unknown'}\n*Time:* ${new Date().toISOString()}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Logs'
            },
            url: 'https://your-logging-url.com', // PLACEHOLDER: Replace with actual logging URL
            style: 'danger'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Retry Generation'
            },
            action_id: 'retry_digest',
            style: 'primary'
          }
        ]
      }
    ];

    return {
      channel: '#product-ops', // PLACEHOLDER: Configure error notification channel
      blocks,
      text: `Weekly Digest Generation Failed: ${error.message}`
    };
  }

  async sendSuccessNotification(results, dateRange) {
    logger.info('Sending success notification');
    
    try {
      const successMessage = this.buildSuccessMessage(results, dateRange);
      await this.postMessage(successMessage);
      
      logger.info('Success notification sent');
    } catch (error) {
      logger.error('Failed to send success notification', { error: error.message });
    }
  }

  buildSuccessMessage(results, dateRange) {
    const weekRange = `${dateRange.startDate.format('MMM D')} - ${dateRange.endDate.format('MMM D, YYYY')}`;
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '✅ Weekly Digest Generated Successfully'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Week:* ${weekRange}\n*Squads Processed:* ${results.summary.successfulDigests}\n*Total Issues:* ${results.summary.totalIssues}\n*Total PRs:* ${results.summary.totalPRs}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Generated at ${new Date().toLocaleString()}`
          }
        ]
      }
    ];

    return {
      channel: '#product-ops', // PLACEHOLDER: Configure success notification channel
      blocks,
      text: `Weekly Digest Generated Successfully for ${weekRange}`
    };
  }

  async handleSlashCommand(command, user, channel) {
    logger.info('Handling Slack slash command', { command, user, channel });
    
    try {
      switch (command) {
        case 'digest now':
          await this.handleGenerateNow(user, channel);
          break;
        case 'digest status':
          await this.handleStatusCheck(user, channel);
          break;
        default:
          await this.handleUnknownCommand(user, channel, command);
      }
    } catch (error) {
      logger.error('Failed to handle slash command', { command, error: error.message });
      await this.sendCommandError(user, channel, error);
    }
  }

  async handleGenerateNow(user, channel) {
    // PLACEHOLDER: Implement immediate digest generation
    const response = {
      channel,
      text: 'Generating digest now...',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Generating weekly digest for <@${user}>...\nThis may take a few minutes.`
          }
        }
      ]
    };
    
    await this.postMessage(response);
    
    // TODO: Trigger digest generation
    logger.info('Digest generation triggered via slash command', { user, channel });
  }

  async handleStatusCheck(user, channel) {
    // PLACEHOLDER: Implement status check
    const response = {
      channel,
      text: 'Checking digest status...',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Digest Status:*\n• Last run: ${new Date().toLocaleString()}\n• Next scheduled run: Monday 7:30 AM CT\n• Status: Active`
          }
        }
      ]
    };
    
    await this.postMessage(response);
  }

  async handleUnknownCommand(user, channel, command) {
    const response = {
      channel,
      text: 'Unknown command',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Unknown command: \`${command}\`\n\nAvailable commands:\n• \`/digest now\` - Generate digest immediately\n• \`/digest status\` - Check system status`
          }
        }
      ]
    };
    
    await this.postMessage(response);
  }

  async sendCommandError(user, channel, error) {
    const response = {
      channel,
      text: 'Command failed',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `❌ Command failed: ${error.message}\n\nPlease try again or contact the development team.`
          }
        }
      ]
    };
    
    await this.postMessage(response);
  }
}

module.exports = { SlackNotifier };
