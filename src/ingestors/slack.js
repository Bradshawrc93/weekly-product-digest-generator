const { logger } = require('../utils/logger');
const { WebClient } = require('@slack/web-api');
const moment = require('moment');

class SlackIngestor {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  async collectData(squad, dateRange) {
    logger.logSquad('info', 'Collecting Slack data', squad.name, { 
      startDate: dateRange.startDate.format(), 
      endDate: dateRange.endDate.format() 
    });
    
    try {
      const decisions = await this.fetchDecisions(squad, dateRange);
      const risks = await this.fetchRisks(squad, dateRange);
      const launches = await this.fetchLaunches(squad, dateRange);
      
      // Process and enrich data
      const processedDecisions = await this.processDecisions(decisions, squad);
      const processedRisks = await this.processRisks(risks, squad);
      const processedLaunches = await this.processLaunches(launches, squad);
      
      return {
        decisions: processedDecisions,
        risks: processedRisks,
        launches: processedLaunches,
        summary: {
          totalDecisions: processedDecisions.length,
          totalRisks: processedRisks.length,
          totalLaunches: processedLaunches.length,
          decisionsByChannel: this.groupByChannel(processedDecisions),
          risksBySeverity: this.groupBySeverity(processedRisks)
        }
      };
    } catch (error) {
      logger.logSquad('error', 'Failed to collect Slack data', squad.name, { error: error.message });
      throw error;
    }
  }

  async fetchDecisions(squad, dateRange) {
    logger.logSquad('debug', 'Fetching Slack decisions', squad.name, { 
      channels: this.getChannelsForSquad(squad),
      dateRange: `${dateRange.startDate.format()} to ${dateRange.endDate.format()}`
    });

    const allDecisions = [];
    const channels = this.getChannelsForSquad(squad);
    
    for (const channel of channels) {
      try {
        const channelDecisions = await this.fetchChannelDecisions(channel, squad, dateRange);
        allDecisions.push(...channelDecisions);
        
        logger.logSquad('debug', 'Fetched decisions for channel', squad.name, { 
          channel, 
          decisionCount: channelDecisions.length 
        });
      } catch (error) {
        logger.logSquad('warn', 'Failed to fetch decisions for channel', squad.name, { 
          channel, 
          error: error.message 
        });
      }
    }

    logger.logSquad('info', 'Slack decisions fetched successfully', squad.name, { 
      totalDecisions: allDecisions.length 
    });

    return allDecisions;
  }

  async fetchChannelDecisions(channel, squad, dateRange) {
    try {
      // Get channel ID
      const channelId = await this.getChannelId(channel);
      if (!channelId) {
        logger.logSquad('warn', 'Channel not found', squad.name, { channel });
        return [];
      }

      // Fetch messages from channel
      const messages = await this.fetchChannelMessages(channelId, dateRange);
      
      // Filter for decision-related messages
      const decisionMessages = messages.filter(message => 
        this.isDecisionMessage(message, squad)
      );

      return decisionMessages;
    } catch (error) {
      logger.logSquad('error', 'Failed to fetch channel decisions', squad.name, { 
        channel, 
        error: error.message 
      });
      throw error;
    }
  }

  async fetchChannelMessages(channelId, dateRange) {
    const messages = [];
    let cursor = null;
    
    try {
      do {
        const response = await this.client.conversations.history({
          channel: channelId,
          limit: 100,
          cursor: cursor,
          oldest: Math.floor(dateRange.startDate.valueOf() / 1000),
          latest: Math.floor(dateRange.endDate.valueOf() / 1000)
        });

        messages.push(...response.messages);
        cursor = response.response_metadata?.next_cursor;
      } while (cursor);

      return messages;
    } catch (error) {
      logger.logSquad('error', 'Failed to fetch channel messages', { 
        channelId, 
        error: error.message 
      });
      throw error;
    }
  }

  async fetchRisks(squad, dateRange) {
    logger.logSquad('debug', 'Fetching Slack risks', squad.name);
    
    // Similar to decisions but with risk keywords
    const allRisks = [];
    const channels = this.getChannelsForSquad(squad);
    
    for (const channel of channels) {
      try {
        const channelRisks = await this.fetchChannelRisks(channel, squad, dateRange);
        allRisks.push(...channelRisks);
      } catch (error) {
        logger.logSquad('warn', 'Failed to fetch risks for channel', squad.name, { 
          channel, 
          error: error.message 
        });
      }
    }

    return allRisks;
  }

  async fetchChannelRisks(channel, squad, dateRange) {
    try {
      const channelId = await this.getChannelId(channel);
      if (!channelId) return [];

      const messages = await this.fetchChannelMessages(channelId, dateRange);
      
      // Filter for risk-related messages
      const riskMessages = messages.filter(message => 
        this.isRiskMessage(message, squad)
      );

      return riskMessages;
    } catch (error) {
      logger.logSquad('error', 'Failed to fetch channel risks', squad.name, { 
        channel, 
        error: error.message 
      });
      throw error;
    }
  }

  async fetchLaunches(squad, dateRange) {
    logger.logSquad('debug', 'Fetching Slack launches', squad.name);
    
    // Similar to decisions but with launch keywords
    const allLaunches = [];
    const channels = this.getChannelsForSquad(squad);
    
    for (const channel of channels) {
      try {
        const channelLaunches = await this.fetchChannelLaunches(channel, squad, dateRange);
        allLaunches.push(...channelLaunches);
      } catch (error) {
        logger.logSquad('warn', 'Failed to fetch launches for channel', squad.name, { 
          channel, 
          error: error.message 
        });
      }
    }

    return allLaunches;
  }

  async fetchChannelLaunches(channel, squad, dateRange) {
    try {
      const channelId = await this.getChannelId(channel);
      if (!channelId) return [];

      const messages = await this.fetchChannelMessages(channelId, dateRange);
      
      // Filter for launch-related messages
      const launchMessages = messages.filter(message => 
        this.isLaunchMessage(message, squad)
      );

      return launchMessages;
    } catch (error) {
      logger.logSquad('error', 'Failed to fetch channel launches', squad.name, { 
        channel, 
        error: error.message 
      });
      throw error;
    }
  }

  getChannelsForSquad(squad) {
    const channels = [];
    
    // Add squad-specific channel if configured
    if (squad.slackChannel) {
      channels.push(squad.slackChannel);
    }
    
    // Add shared channels from global settings
    // PLACEHOLDER: This should be loaded from config
    channels.push('#product', '#engineering');
    
    return channels;
  }

  async getChannelId(channelName) {
    try {
      // Remove # if present
      const cleanChannelName = channelName.replace('#', '');
      
      const response = await this.client.conversations.list({
        types: 'public_channel,private_channel'
      });

      const channel = response.channels.find(ch => ch.name === cleanChannelName);
      return channel?.id;
    } catch (error) {
      logger.logSquad('error', 'Failed to get channel ID', { 
        channelName, 
        error: error.message 
      });
      return null;
    }
  }

  isDecisionMessage(message, squad) {
    if (!message.text) return false;
    
    const decisionKeywords = ['decided', 'decision', 'agreed', 'agreement', 'approved', 'approval'];
    const text = message.text.toLowerCase();
    
    // Check for decision keywords
    const hasDecisionKeyword = decisionKeywords.some(keyword => text.includes(keyword));
    
    // Check for squad member mentions
    const hasSquadMention = squad.members.some(member => 
      text.includes(member.slackHandle.toLowerCase())
    );
    
    // Filter out bot messages and noise
    const isNotBot = !message.bot_id;
    const isNotNoise = !this.isNoiseMessage(message);
    
    return hasDecisionKeyword && (hasSquadMention || !squad.slackChannel) && isNotBot && isNotNoise;
  }

  isRiskMessage(message, squad) {
    if (!message.text) return false;
    
    const riskKeywords = ['risk', 'concern', 'issue', 'blocked', 'blocker', 'stuck', 'problem'];
    const text = message.text.toLowerCase();
    
    const hasRiskKeyword = riskKeywords.some(keyword => text.includes(keyword));
    const hasSquadMention = squad.members.some(member => 
      text.includes(member.slackHandle.toLowerCase())
    );
    const isNotBot = !message.bot_id;
    const isNotNoise = !this.isNoiseMessage(message);
    
    return hasRiskKeyword && (hasSquadMention || !squad.slackChannel) && isNotBot && isNotNoise;
  }

  isLaunchMessage(message, squad) {
    if (!message.text) return false;
    
    const launchKeywords = ['launch', 'deploy', 'release', 'shipped', 'live', 'production'];
    const text = message.text.toLowerCase();
    
    const hasLaunchKeyword = launchKeywords.some(keyword => text.includes(keyword));
    const hasSquadMention = squad.members.some(member => 
      text.includes(member.slackHandle.toLowerCase())
    );
    const isNotBot = !message.bot_id;
    const isNotNoise = !this.isNoiseMessage(message);
    
    return hasLaunchKeyword && (hasSquadMention || !squad.slackChannel) && isNotBot && isNotNoise;
  }

  isNoiseMessage(message) {
    if (!message.text) return true;
    
    const text = message.text.trim();
    
    // Pure emoji reactions
    if (/^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u.test(text)) {
      return true;
    }
    
    // Trivial acknowledgments
    const trivialResponses = ['👍', 'thanks', 'thank you', 'ok', 'okay', 'got it', 'yep', 'yes', 'no'];
    if (trivialResponses.some(response => text.toLowerCase().includes(response))) {
      return true;
    }
    
    return false;
  }

  async processDecisions(messages, squad) {
    return messages.map(message => {
      const mentions = this.extractMentions(message.text, squad);
      const classification = this.classifyMessage(message.text);
      
      return {
        channel: message.channel,
        timestamp: message.ts,
        author: message.user,
        text: message.text,
        threadTs: message.thread_ts || message.ts,
        mentions: mentions,
        classification: classification,
        permalink: this.buildPermalink(message.channel, message.ts),
        reactions: message.reactions || [],
        attachments: message.attachments || []
      };
    });
  }

  async processRisks(messages, squad) {
    return messages.map(message => {
      const mentions = this.extractMentions(message.text, squad);
      const severity = this.assessRiskSeverity(message.text);
      
      return {
        channel: message.channel,
        timestamp: message.ts,
        author: message.user,
        text: message.text,
        threadTs: message.thread_ts || message.ts,
        mentions: mentions,
        severity: severity,
        permalink: this.buildPermalink(message.channel, message.ts),
        reactions: message.reactions || [],
        attachments: message.attachments || []
      };
    });
  }

  async processLaunches(messages, squad) {
    return messages.map(message => {
      const mentions = this.extractMentions(message.text, squad);
      
      return {
        channel: message.channel,
        timestamp: message.ts,
        author: message.user,
        text: message.text,
        threadTs: message.thread_ts || message.ts,
        mentions: mentions,
        permalink: this.buildPermalink(message.channel, message.ts),
        reactions: message.reactions || [],
        attachments: message.attachments || []
      };
    });
  }

  extractMentions(text, squad) {
    const mentions = [];
    
    // Extract @mentions
    const mentionMatches = text.match(/@[\w-]+/g) || [];
    mentions.push(...mentionMatches);
    
    // Check for squad member mentions
    const squadMentions = squad.members
      .filter(member => text.includes(member.slackHandle))
      .map(member => member.slackHandle);
    
    mentions.push(...squadMentions);
    
    return [...new Set(mentions)];
  }

  classifyMessage(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('decided') || lowerText.includes('decision') || lowerText.includes('agreed')) {
      return 'decision';
    } else if (lowerText.includes('blocked') || lowerText.includes('blocker') || lowerText.includes('stuck')) {
      return 'blocker';
    } else if (lowerText.includes('launch') || lowerText.includes('deploy') || lowerText.includes('release')) {
      return 'launch';
    } else if (lowerText.includes('risk') || lowerText.includes('concern') || lowerText.includes('issue')) {
      return 'risk';
    }
    
    return 'general';
  }

  assessRiskSeverity(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('critical') || lowerText.includes('urgent') || lowerText.includes('emergency')) {
      return 'high';
    } else if (lowerText.includes('important') || lowerText.includes('significant')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  buildPermalink(channelId, timestamp) {
    // PLACEHOLDER: Build Slack permalink
    // This would need the workspace domain
    return `https://slack.com/app_redirect?channel=${channelId}&message_ts=${timestamp}`;
  }

  groupByChannel(messages) {
    return messages.reduce((acc, message) => {
      const channel = message.channel || 'Unknown';
      acc[channel] = (acc[channel] || 0) + 1;
      return acc;
    }, {});
  }

  groupBySeverity(risks) {
    return risks.reduce((acc, risk) => {
      const severity = risk.severity || 'Unknown';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = { SlackIngestor };
