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
      const threads = await this.fetchSlackThreads(squad, dateRange);
      
      // Process and enrich data
      const processedDecisions = await this.processDecisions(decisions, squad);
      const processedRisks = await this.processRisks(risks, squad);
      const processedThreads = await this.processThreads(threads, squad);
      
      // Separate squad-specific and general threads
      const squadSpecificThreads = processedThreads.filter(thread => thread.isSquadSpecific);
      const generalThreads = processedThreads.filter(thread => !thread.isSquadSpecific);
      
      return {
        decisions: processedDecisions,
        risks: processedRisks,
        threads: squadSpecificThreads,
        generalThreads: generalThreads,
        summary: {
          totalDecisions: processedDecisions.length,
          totalRisks: processedRisks.length,
          totalThreads: processedThreads.length,
          squadSpecificThreads: squadSpecificThreads.length,
          generalThreads: generalThreads.length,
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

  async fetchSlackThreads(squad, dateRange) {
    logger.logSquad('debug', 'Fetching Slack threads', squad.name);
    
    // Similar to decisions but with thread keywords
    const allThreads = [];
    const channels = this.getChannelsForSquad(squad);
    
    for (const channel of channels) {
      try {
        const channelThreads = await this.fetchChannelThreads(channel, squad, dateRange);
        allThreads.push(...channelThreads);
      } catch (error) {
        logger.logSquad('warn', 'Failed to fetch threads for channel', squad.name, { 
          channel, 
          error: error.message 
        });
      }
    }

    return allThreads;
  }

  async fetchChannelThreads(channel, squad, dateRange) {
    try {
      const channelId = await this.getChannelId(channel);
      if (!channelId) return [];

      const messages = await this.fetchChannelMessages(channelId, dateRange);
      
      // Filter for thread-related messages
      const threadMessages = messages.filter(message => 
        this.isThreadMessage(message, squad)
      );

      return threadMessages;
    } catch (error) {
      logger.logSquad('error', 'Failed to fetch channel threads', squad.name, { 
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
      
      // Hard-coded channel ID for #product since we can't list channels
      if (cleanChannelName === 'product') {
        return 'C08T8ARC5T9';
      }
      
      // Try to list channels (may fail due to missing scope)
      try {
        const response = await this.client.conversations.list({
          types: 'public_channel,private_channel'
        });

        const channel = response.channels.find(ch => ch.name === cleanChannelName);
        return channel?.id;
      } catch (listError) {
        logger.logSquad('warn', 'Cannot list channels, using hard-coded IDs', { 
          channelName: cleanChannelName,
          error: listError.message 
        });
        return null;
      }
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
    
    const decisionKeywords = ['decided', 'decision', 'agreed', 'agreement', 'approved', 'approval', 'final', 'settled'];
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
    
    // For shared channels like #product, be more inclusive
    const isSharedChannel = squad.slackChannel === '#product';
    
    return hasDecisionKeyword && (hasSquadMention || isSharedChannel) && isNotBot && isNotNoise;
  }

  isRiskMessage(message, squad) {
    if (!message.text) return false;
    
    const riskKeywords = ['risk', 'concern', 'issue', 'blocked', 'blocker', 'stuck', 'problem', 'trouble', 'challenge'];
    const text = message.text.toLowerCase();
    
    const hasRiskKeyword = riskKeywords.some(keyword => text.includes(keyword));
    const hasSquadMention = squad.members.some(member => 
      text.includes(member.slackHandle.toLowerCase())
    );
    const isNotBot = !message.bot_id;
    const isNotNoise = !this.isNoiseMessage(message);
    
    // For shared channels like #product, be more inclusive
    const isSharedChannel = squad.slackChannel === '#product';
    
    return hasRiskKeyword && (hasSquadMention || isSharedChannel) && isNotBot && isNotNoise;
  }

  isThreadMessage(message, squad) {
    if (!message.text) return false;
    
    const threadKeywords = ['launch', 'deploy', 'release', 'shipped', 'live', 'production', 'go-live', 'meeting', 'discussion', 'conversation', 'update', 'announcement'];
    const text = message.text.toLowerCase();
    
    const hasThreadKeyword = threadKeywords.some(keyword => text.includes(keyword));
    const hasSquadMention = squad.members.some(member => 
      text.includes(member.slackHandle.toLowerCase())
    );
    const isNotBot = !message.bot_id;
    const isNotNoise = !this.isNoiseMessage(message);
    
    // For shared channels like #product, be more inclusive
    const isSharedChannel = squad.slackChannel === '#product';
    
    return hasThreadKeyword && (hasSquadMention || isSharedChannel) && isNotBot && isNotNoise;
  }

  /**
   * Determine if a message is squad-specific or general product conversation
   */
  isSquadSpecificMessage(message, squad) {
    if (!message.text) return false;
    
    const text = message.text.toLowerCase();
    
    // Check for squad member mentions
    const hasSquadMention = squad.members.some(member => 
      text.includes(member.slackHandle.toLowerCase())
    );
    
    // Check for squad-specific keywords or project names
    const squadKeywords = this.getSquadKeywords(squad);
    const hasSquadKeyword = squadKeywords.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    // Check for squad-specific channels
    const isSquadChannel = squad.slackChannel && squad.slackChannel !== '#product';
    
    // Check for specific squad-related terms
    const squadSpecificTerms = [
      'our team',
      'our squad',
      'my team',
      'my squad',
      squad.name.toLowerCase(),
      ...squadKeywords.map(k => k.toLowerCase())
    ];
    
    const hasSquadSpecificTerm = squadSpecificTerms.some(term => 
      text.includes(term)
    );
    
    // If it mentions multiple squads or is very general, it's not squad-specific
    const allSquadNames = [
      'customer-facing', 'empower', 'smarteraccess', 'ui',
      'human in the loop', 'hitl',
      'developer efficiency',
      'data collection', 'data lakehouse',
      'thoughthub', 'platform',
      'core rcm',
      'voice',
      'medical coding',
      'deep research'
    ];
    
    const mentionsMultipleSquads = allSquadNames.filter(name => 
      text.includes(name)
    ).length > 1;
    
    // If it mentions multiple squads, it's general
    if (mentionsMultipleSquads) {
      return false;
    }
    
    // Check for general product messages that should NOT be squad-specific
    const generalProductTerms = [
      'hey team',
      'quick reminder',
      'all hands',
      'weekly product',
      'squad notes',
      'notion page',
      'meeting',
      'everyone',
      'all squads',
      'team members'
    ];
    
    const isGeneralProductMessage = generalProductTerms.some(term => 
      text.includes(term)
    );
    
    // If it's a general product message, it's not squad-specific
    if (isGeneralProductMessage) {
      return false;
    }
    
    // For a message to be squad-specific, it must have a clear connection to the squad
    // Either through mentions, keywords, or specific squad terms
    return hasSquadMention || hasSquadKeyword || isSquadChannel || hasSquadSpecificTerm;
  }

  /**
   * Get squad-specific keywords for better detection
   */
  getSquadKeywords(squad) {
    const squadKeywordMap = {
      'Voice': ['voice', 'audio', 'speech', 'recording', 'transcription'],
      'Core RCM': ['rcm', 'revenue', 'billing', 'claims', 'payment'],
      'Medical Coding': ['coding', 'icd', 'cpt', 'medical', 'diagnosis'],
      'Data Collection / Data Lakehouse': ['data', 'lakehouse', 'collection', 'analytics', 'warehouse'],
      'ThoughtHub Platform': ['thoughthub', 'platform', 'content', 'knowledge'],
      'Developer Efficiency': ['developer', 'efficiency', 'tooling', 'automation', 'ci/cd'],
      'Human in the loop (HITL)': ['hitl', 'human', 'review', 'approval', 'manual'],
      'Customer-Facing (Empower/SmarterAccess UI)': ['empower', 'smarteraccess', 'ui', 'customer', 'frontend'],
      'Deep Research': ['research', 'ai', 'ml', 'machine learning', 'deep learning']
    };
    
    return squadKeywordMap[squad.name] || [];
  }

  isNoiseMessage(message) {
    if (!message.text) return true;
    
    const text = message.text.trim();
    
    // Pure emoji reactions
    if (/^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u.test(text)) {
      return true;
    }
    
    // Trivial acknowledgments - only if they're standalone or very short
    const trivialResponses = ['👍', 'thanks', 'thank you', 'ok', 'okay', 'got it', 'yep', 'yes', 'no'];
    const isTrivialResponse = trivialResponses.some(response => {
      const lowerText = text.toLowerCase();
      // Only mark as noise if it's a standalone response or very short
      return lowerText === response || 
             lowerText === `@${response}` ||
             (lowerText.length < 50 && lowerText.includes(response));
    });
    
    if (isTrivialResponse) {
      return true;
    }
    
    return false;
  }

  async processDecisions(messages, squad) {
    return messages.map(message => {
      const mentions = this.extractMentions(message.text, squad);
      const classification = this.classifyMessage(message.text);
      
      // Extract topic and decision from message text
      const topic = this.extractTopic(message.text);
      const decision = this.extractDecision(message.text);
      
      return {
        channel: message.channel,
        timestamp: message.ts,
        author: message.user,
        text: message.text,
        threadTs: message.thread_ts || message.ts,
        mentions: mentions,
        classification: classification,
        topic: topic,
        decision: decision,
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
      
      // Extract topic and description from message text
      const topic = this.extractTopic(message.text);
      const description = this.extractDescription(message.text);
      
      return {
        channel: message.channel,
        timestamp: message.ts,
        author: message.user,
        text: message.text,
        threadTs: message.thread_ts || message.ts,
        mentions: mentions,
        severity: severity,
        topic: topic,
        description: description,
        permalink: this.buildPermalink(message.channel, message.ts),
        reactions: message.reactions || [],
        attachments: message.attachments || []
      };
    });
  }

  async processThreads(messages, squad) {
    // Group messages by thread to count only parent threads
    const threadGroups = new Map();
    
    messages.forEach(message => {
      const threadTs = message.thread_ts || message.ts;
      if (!threadGroups.has(threadTs)) {
        threadGroups.set(threadTs, []);
      }
      threadGroups.get(threadTs).push(message);
    });
    
    // Process only the parent messages (first message in each thread)
    return Array.from(threadGroups.values()).map(threadMessages => {
      const parentMessage = threadMessages[0]; // First message is the parent
      const mentions = this.extractMentions(parentMessage.text, squad);
      const isSquadSpecific = this.isSquadSpecificMessage(parentMessage, squad);
      
      return {
        channel: parentMessage.channel,
        timestamp: parentMessage.ts,
        author: parentMessage.user,
        text: parentMessage.text,
        threadTs: parentMessage.thread_ts || parentMessage.ts,
        mentions: mentions,
        isSquadSpecific: isSquadSpecific,
        permalink: this.buildPermalink(parentMessage.channel, parentMessage.ts),
        reactions: parentMessage.reactions || [],
        attachments: parentMessage.attachments || [],
        replyCount: threadMessages.length - 1 // Number of replies
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

  extractTopic(text) {
    // Extract the main topic from the message
    const lines = text.split('\n');
    const firstLine = lines[0].trim();
    
    // Try to extract a concise topic from the first line
    if (firstLine.length > 0 && firstLine.length <= 100) {
      return firstLine;
    }
    
    // Fallback to first 50 characters
    return text.substring(0, 50).trim() + (text.length > 50 ? '...' : '');
  }

  extractDecision(text) {
    // Extract the decision from the message
    const lowerText = text.toLowerCase();
    
    // Look for decision-related phrases
    const decisionPhrases = [
      'decided to',
      'agreed to',
      'approved',
      'will',
      'going to',
      'planning to'
    ];
    
    for (const phrase of decisionPhrases) {
      const index = lowerText.indexOf(phrase);
      if (index !== -1) {
        const start = Math.max(0, index);
        const end = Math.min(text.length, start + 200);
        return text.substring(start, end).trim() + (end < text.length ? '...' : '');
      }
    }
    
    // Fallback to first 100 characters
    return text.substring(0, 100).trim() + (text.length > 100 ? '...' : '');
  }

  extractDescription(text) {
    // Extract a description from the message
    const lines = text.split('\n');
    
    // Find the first substantial line
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && !trimmed.startsWith('@') && !trimmed.startsWith('http')) {
        return trimmed.substring(0, 150).trim() + (trimmed.length > 150 ? '...' : '');
      }
    }
    
    // Fallback to first 100 characters
    return text.substring(0, 100).trim() + (text.length > 100 ? '...' : '');
  }

  buildPermalink(channelId, timestamp) {
    // Build Slack permalink with proper channel ID
    if (!channelId) {
      // Fallback to the hardcoded product channel ID
      channelId = 'C08T8ARC5T9';
    }
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
