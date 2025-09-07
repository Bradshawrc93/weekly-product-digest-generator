const notion = require('../connectors/notion');
const config = require('../utils/config');
const { logger } = require('../utils/logger');
const aiService = require('../services/aiService');

class NotionPageGenerator {
  constructor() {
    this.squads = config.squads;
    this.maxBlocks = 60; // Very conservative limit to ensure we stay under 100
  }

  /**
   * Generate the complete weekly report page
   */
  async generateWeeklyReport(dateRange, metrics, organizedData) {
    try {
      logger.info('Generating Notion page', { dateRange: dateRange.display });

      // Step 1: Plan the entire page with all content
      const allBlocks = [];
      
      // AI TL;DR section
      const aiTldrBlocks = await this.createAITLDRSection(metrics, organizedData);
      allBlocks.push(...aiTldrBlocks);
      allBlocks.push(notion.createDividerBlock());

      // What Shipped section (with ALL tickets)
      const whatShippedBlocks = this.createWhatShippedSection(organizedData, allBlocks.length);
      allBlocks.push(...whatShippedBlocks);
      allBlocks.push(notion.createDividerBlock());

      // Change Log section
      const changeLogBlocks = this.createChangeLogSection(organizedData, allBlocks.length);
      allBlocks.push(...changeLogBlocks);
      allBlocks.push(notion.createDividerBlock());

      // Blocked tickets section
      const blockedBlocks = this.createBlockedTicketsSection(organizedData, allBlocks.length);
      allBlocks.push(...blockedBlocks);

      logger.info('Complete page planned', { 
        totalBlocks: allBlocks.length,
        title: `Weekly Report: ${dateRange.display}`
      });

      // Step 2: Split into chunks and send
      const chunks = this.splitBlocksIntoChunks(allBlocks, 90);
      logger.info('Page split into chunks', { 
        totalChunks: chunks.length,
        chunkSizes: chunks.map(chunk => chunk.length)
      });

      // Step 3: Create page with first chunk
      const pageData = {
        title: `Weekly Report: ${dateRange.display}`,
        children: chunks[0]
      };

      const response = await notion.createPage(pageData);
      
      logger.info('Initial page created successfully', { 
        pageId: response.id,
        title: pageData.title,
        initialBlocks: chunks[0].length
      });

      // Step 4: Append remaining chunks
      for (let i = 1; i < chunks.length; i++) {
        logger.info('Appending chunk to page', { 
          chunkIndex: i + 1,
          blocksInChunk: chunks[i].length
        });
        
        await notion.appendBlocksToPage(response.id, chunks[i]);
        
        logger.info('Chunk appended successfully', { 
          pageId: response.id,
          chunkIndex: i + 1
        });
      }

      logger.info('Weekly report page generation completed', { 
        pageId: response.id,
        title: pageData.title,
        totalBlocks: allBlocks.length,
        totalChunks: chunks.length
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate weekly report page', { error: error.message });
      throw error;
    }
  }

  /**
   * Create AI TL;DR section
   */
  async createAITLDRSection(metrics, organizedData) {
    const aiSummaryRichText = await this.generateAITLDRSummaryRichText(metrics, organizedData);
    
    return [
      notion.createHeadingBlock('🤖 AI TL;DR', 1),
      notion.createRichTextCalloutBlock(aiSummaryRichText, '🚀'),
      notion.createParagraphBlock('')
    ];
  }

  /**
   * Generate AI TL;DR summary based on data
   */
  async generateAITLDRSummary(metrics, organizedData) {
    try {
      // Calculate key metrics
      const totalDone = Object.values(metrics).reduce((sum, squad) => sum + squad.done, 0);
      const totalCreated = Object.values(metrics).reduce((sum, squad) => sum + squad.created, 0);
      const totalStale = Object.values(metrics).reduce((sum, squad) => sum + squad.stale, 0);
      const totalBlocked = Object.values(metrics).reduce((sum, squad) => sum + squad.blocked, 0);

      // Use AI service to generate intelligent summary
      const aiSummary = await aiService.generateShippedWorkSummary(organizedData, metrics);
      
      // Add additional context about new work and blockers
      let summary = aiSummary;
      
      if (totalCreated > 0) {
        summary += ` Additionally, we created ${totalCreated} new work items, setting the stage for next week's deliveries. `;
      }

      if (totalStale > 0 || totalBlocked > 0) {
        summary += `What's Next: We need to address ${totalStale} items that have been waiting and unblock ${totalBlocked} critical path items. `;
      } else {
        summary += `Clean Operations: All systems are running smoothly with no bottlenecks. `;
      }

      return summary;
    } catch (error) {
      logger.error('Failed to generate AI TL;DR summary', { error: error.message });
      
      // Fallback to basic summary
      const totalDone = Object.values(metrics).reduce((sum, squad) => sum + squad.done, 0);
      const totalCreated = Object.values(metrics).reduce((sum, squad) => sum + squad.created, 0);
      
      return `This week's story: We shipped ${totalDone} key deliverables${totalCreated > 0 ? ` while creating ${totalCreated} new work items` : ''}. AI summary generation failed, but the detailed work is listed below.`;
    }
  }

  /**
   * Generate AI TL;DR summary with rich text formatting
   */
  async generateAITLDRSummaryRichText(metrics, organizedData) {
    try {
      // Use AI service to generate intelligent summary
      const aiSummary = await aiService.generateShippedWorkSummary(organizedData, metrics);
      
      // Calculate additional metrics for context
      const totalCreated = Object.values(metrics).reduce((sum, squad) => sum + squad.created, 0);
      const totalStale = Object.values(metrics).reduce((sum, squad) => sum + squad.stale, 0);
      const totalBlocked = Object.values(metrics).reduce((sum, squad) => sum + squad.blocked, 0);

      // Build rich text array
      const richTextArray = [];

      // Add the AI-generated summary
      richTextArray.push({
        type: 'text',
        text: { content: aiSummary },
        annotations: {}
      });
      
      // Add additional context about new work and blockers
      if (totalCreated > 0) {
        richTextArray.push({
          type: 'text',
          text: { content: ` Additionally, we created ${totalCreated} new work items, setting the stage for next week's deliveries. ` }
        });
      }

      if (totalStale > 0 || totalBlocked > 0) {
        richTextArray.push({
          type: 'text',
          text: { content: 'What\'s Next: ' },
          annotations: { bold: true }
        });
        richTextArray.push({
          type: 'text',
          text: { content: `We need to address ${totalStale} items that have been waiting and unblock ${totalBlocked} critical path items. ` }
        });
      } else {
        richTextArray.push({
          type: 'text',
          text: { content: 'Clean Operations: All systems are running smoothly with no bottlenecks. ' }
        });
      }

      return richTextArray;
    } catch (error) {
      logger.error('Failed to generate AI TL;DR summary', { error: error.message });
      return [{
        type: 'text',
        text: { content: 'AI summary generation failed. Please check the data and try again.' }
      }];
    }
  }

  /**
   * Create metrics table
   */
  createMetricsTable(metrics) {
    try {
      // Create headers (squad names)
      const headers = ['Squad', ...this.squads.map(squad => squad.displayName)];
      
      // Create rows for each metric
      const rows = [
        ['Done', ...this.squads.map(squad => metrics[squad.name]?.done || 0)],
        ['Updated', ...this.squads.map(squad => metrics[squad.name]?.updated || 0)],
        ['Created', ...this.squads.map(squad => metrics[squad.name]?.created || 0)],
        ['Stale', ...this.squads.map(squad => metrics[squad.name]?.stale || 0)],
        ['In-Progress', ...this.squads.map(squad => metrics[squad.name]?.inProgress || 0)],
        ['Blocked', ...this.squads.map(squad => metrics[squad.name]?.blocked || 0)]
      ];

      return [
        notion.createHeadingBlock('📊 Weekly Metrics', 1),
        notion.createTableBlock(headers, rows),
        notion.createParagraphBlock('')
      ];
    } catch (error) {
      logger.error('Failed to create metrics table', { error: error.message });
      return [notion.createParagraphBlock('Error creating metrics table')];
    }
  }

  /**
   * Create What Shipped section
   */
  createWhatShippedSection(organizedData, currentBlockCount = 0) {
    const blocks = [
      notion.createHeadingBlock('🚢 What Shipped', 1)
    ];

    // Always include descriptions for completed tickets
    const includeDescriptions = true;

    for (const squad of this.squads) {
      const squadData = organizedData[squad.name];
      const completedTickets = squadData?.completedTickets || [];

      if (completedTickets.length > 0) {
        // Squad header
        blocks.push(
          notion.createHeadingBlock(squad.displayName, 2)
        );

        // Show ALL tickets for all squads - no limits
        const ticketsToShow = completedTickets;
        
        ticketsToShow.forEach(ticket => {
          const richText = [
            notion.createRichTextWithLink(ticket.key, ticket.jiraUrl),
            notion.createRichText(' - '),
            notion.createRichText(ticket.summary),
            notion.createRichText(` (${ticket.assignee})`, { italic: true })
          ];
          
          blocks.push(notion.createMixedParagraph(richText));
          
          // Add description as a toggle block to save space
          if (includeDescriptions && ticket.description && ticket.description.trim() !== '') {
            const descriptionParagraph = notion.createParagraphBlock(ticket.description);
            blocks.push(notion.createToggleBlock('Ticket Description', [descriptionParagraph]));
          }
        });
        
        // No truncation - show all tickets

        blocks.push(notion.createParagraphBlock(''));
      }
    }

    if (blocks.length === 1) {
      blocks.push(notion.createParagraphBlock('No tickets were completed this week.'));
    }

    return blocks;
  }

  /**
   * Split blocks into chunks of 90 for Notion API limits
   */
  splitBlocksIntoChunks(allBlocks, chunkSize = 90) {
    const chunks = [];
    for (let i = 0; i < allBlocks.length; i += chunkSize) {
      chunks.push(allBlocks.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Create Change Log section
   */
  createChangeLogSection(organizedData, currentBlockCount) {
    const blocks = [
      notion.createHeadingBlock('📝 Change Log', 1)
    ];

    // Only show squads with changelog events
    const squadsWithEvents = this.squads.filter(squad => {
      const squadData = organizedData[squad.name];
      return squadData?.changelogEvents?.length > 0;
    });

    if (squadsWithEvents.length === 0) {
      blocks.push(notion.createParagraphBlock('No changelog events this week.'));
      return blocks;
    }

    // Calculate remaining blocks available for changelog
    const remainingBlocks = this.maxBlocks - currentBlockCount - 20; // Reserve 20 for other sections
    const maxChangelogBlocks = Math.max(remainingBlocks, 15); // Minimum 15 blocks for changelog

    logger.info('Changelog block allocation', { 
      currentBlocks: currentBlockCount,
      remainingBlocks,
      maxChangelogBlocks
    });

    // Show squads with events using toggle blocks (collapsible sections)
    let blocksUsed = 1; // Heading block
    let squadsShown = 0;
    let eventsShown = 0;

    for (const squad of squadsWithEvents) {
      if (blocksUsed >= maxChangelogBlocks) {
        break;
      }

      const squadData = organizedData[squad.name];
      const changelogEvents = squadData?.changelogEvents || [];

      // Group events by ticket
      const groupedEvents = this.groupChangelogByTicket(changelogEvents);
      
      // Create toggle children for all changelog events
      const toggleChildren = [];
      
      // Show tickets with events in the toggle (limit to prevent Notion API errors)
      const maxToggleChildren = Math.min(90, maxChangelogBlocks - blocksUsed - 2); // Respect calculated limit
      let childrenCount = 0;
      
      for (const ticketGroup of groupedEvents) {
        // Check if we can add more children (each ticket adds 3 blocks: header, event, spacing)
        if (childrenCount + 3 > maxToggleChildren) {
          // Add truncation notice if we hit the limit
          if (childrenCount < maxToggleChildren) {
            toggleChildren.push(notion.createCalloutBlock(
              `... and ${groupedEvents.length - toggleChildren.length / 3} more tickets (truncated due to Notion limits)`,
              'ℹ️'
            ));
          }
          break;
        }
        
        // Ticket header
        const ticketHeader = [
          notion.createRichTextWithLink(ticketGroup.key, `${config.jira.baseUrl}/browse/${ticketGroup.key}`),
          notion.createRichText(' - '),
          notion.createRichText(ticketGroup.summary, { bold: true })
        ];
        toggleChildren.push(notion.createMixedParagraph(ticketHeader));
        childrenCount++;

        // Show first event for this ticket
        if (ticketGroup.events.length > 0) {
          const event = ticketGroup.events[0];
          const eventText = `${event.displayDate} - ${event.author} ${this.formatChangelogEvent(event)}`;
          toggleChildren.push(notion.createBulletItem(eventText));
          eventsShown++;
          childrenCount++;
        }

        // Add spacing between tickets
        toggleChildren.push(notion.createParagraphBlock(''));
        childrenCount++;
      }

      // Create toggle block with squad name and all events
      const toggleText = `${squad.displayName} (${groupedEvents.length} tickets updated)`;
      blocks.push(notion.createToggleBlock(toggleText, toggleChildren));
      blocks.push(notion.createParagraphBlock(''));
      
      blocksUsed += 2; // Toggle block + spacing
      squadsShown++;
    }

    // Add summary if we had to truncate
    if (squadsShown < squadsWithEvents.length) {
      blocks.push(
        notion.createCalloutBlock(
          `Showing changelog for ${squadsShown} of ${squadsWithEvents.length} squads due to space constraints.`,
          'ℹ️'
        )
      );
    }

    logger.info('Changelog section generated', { 
      squadsShown,
      eventsShown,
      blocksUsed,
      totalSquads: squadsWithEvents.length
    });

    return blocks;
  }

  /**
   * Create Stale Tickets section
   */
  createStaleTicketsSection(organizedData, currentBlockCount = 0) {
    const blocks = [
      notion.createHeadingBlock('⚠️ Stale - Needs Review', 1)
    ];

    // Only show squads with stale tickets
    const squadsWithStale = this.squads.filter(squad => {
      const squadData = organizedData[squad.name];
      return squadData?.staleTickets?.length > 0;
    });

    if (squadsWithStale.length === 0) {
      blocks.push(notion.createParagraphBlock('No stale tickets this week.'));
      return blocks;
    }

    // Always include descriptions for stale tickets
    const includeDescriptions = true;

    // Show all squads with stale tickets using toggle blocks
    squadsWithStale.forEach(squad => {
      const squadData = organizedData[squad.name];
      const staleTickets = squadData?.staleTickets || [];

      // Create toggle children for all stale tickets
      const toggleChildren = [];
      
      staleTickets.forEach(ticket => {
        const richText = [
          notion.createRichTextWithLink(ticket.key, ticket.jiraUrl),
          notion.createRichText(' - '),
          notion.createRichText(ticket.summary),
          notion.createRichText(` (${ticket.assignee})`, { italic: true }),
          notion.createRichText(` - ${ticket.daysStale} days stale`, { color: 'red_background' })
        ];
        
        toggleChildren.push(notion.createMixedParagraph(richText));
        
        // Add description underneath with indentation and italic formatting
        if (includeDescriptions) {
          const indentedDescription = [
            notion.createRichText('\t', {}),
            notion.createRichText(ticket.description, { italic: true })
          ];
          toggleChildren.push(notion.createMixedParagraph(indentedDescription));
        }
      });

      // Create toggle block with squad name and all tickets
      const toggleText = `${squad.displayName} (${staleTickets.length} stale tickets)`;
      blocks.push(notion.createToggleBlock(toggleText, toggleChildren));
      blocks.push(notion.createParagraphBlock(''));
    });

    return blocks;
  }

  /**
   * Create Blocked Tickets section
   */
  createBlockedTicketsSection(organizedData, currentBlockCount = 0) {
    const blocks = [
      notion.createHeadingBlock('🚪 Blocked - Needs Unblocking', 1)
    ];

    // Only show squads with blocked tickets
    const squadsWithBlocked = this.squads.filter(squad => {
      const squadData = organizedData[squad.name];
      return squadData?.blockedTickets?.length > 0;
    });

    if (squadsWithBlocked.length === 0) {
      blocks.push(notion.createParagraphBlock('No blocked tickets this week.'));
      return blocks;
    }

    // Always include descriptions for blocked tickets
    const includeDescriptions = true;

    // Show all squads with blocked tickets using toggle blocks
    squadsWithBlocked.forEach(squad => {
      const squadData = organizedData[squad.name];
      const blockedTickets = squadData?.blockedTickets || [];

      // Create toggle children for all blocked tickets
      const toggleChildren = [];
      
      blockedTickets.forEach(ticket => {
        const richText = [
          notion.createRichTextWithLink(ticket.key, ticket.jiraUrl),
          notion.createRichText(' - '),
          notion.createRichText(ticket.summary),
          notion.createRichText(` (${ticket.assignee})`, { italic: true }),
          notion.createRichText(` - ${ticket.daysBlocked} days blocked`, { color: 'orange_background' })
        ];
        
        toggleChildren.push(notion.createMixedParagraph(richText));
        
        // Add description underneath with indentation and italic formatting
        if (includeDescriptions) {
          const indentedDescription = [
            notion.createRichText('\t', {}),
            notion.createRichText(ticket.description, { italic: true })
          ];
          toggleChildren.push(notion.createMixedParagraph(indentedDescription));
        }
      });

      // Create toggle block with squad name and all tickets
      const toggleText = `${squad.displayName} (${blockedTickets.length} blocked tickets)`;
      blocks.push(notion.createToggleBlock(toggleText, toggleChildren));
      blocks.push(notion.createParagraphBlock(''));
    });

    return blocks;
  }

  /**
   * Create On Deck section
   */
  createOnDeckSection(organizedData) {
    const blocks = [
      notion.createHeadingBlock('🎯 On Deck', 1)
    ];

    // Only show squads with backlog tickets
    const squadsWithBacklog = this.squads.filter(squad => {
      const squadData = organizedData[squad.name];
      return squadData?.backlogTickets?.length > 0;
    });

    if (squadsWithBacklog.length === 0) {
      blocks.push(notion.createParagraphBlock('No backlog tickets to display.'));
      return blocks;
    }

    // Show all squads with backlog tickets using toggle blocks
    squadsWithBacklog.forEach(squad => {
      const squadData = organizedData[squad.name];
      const backlogTickets = squadData?.backlogTickets || [];

      // Create toggle children for backlog tickets (limit to prevent Notion API errors)
      const toggleChildren = [];
      const maxToggleChildren = 90; // Stay well below Notion's 100 limit
      let childrenCount = 0;

      // Group by priority
      const groupedByPriority = this.groupTicketsByPriority(backlogTickets);
      
      for (const [priority, tickets] of Object.entries(groupedByPriority)) {
        if (tickets.length > 0 && childrenCount < maxToggleChildren) {
          toggleChildren.push(
            notion.createHeadingBlock(`${priority} Priority`, 3)
          );
          childrenCount++;

          // Show tickets per priority (with limit)
          for (const ticket of tickets) {
            if (childrenCount + 2 > maxToggleChildren) {
              // Add truncation notice
              toggleChildren.push(notion.createCalloutBlock(
                `... and ${tickets.length - (childrenCount - 1)} more ${priority.toLowerCase()} priority tickets (truncated due to Notion limits)`,
                'ℹ️'
              ));
              childrenCount++;
              break;
            }
            
            const richText = [
              notion.createRichTextWithLink(ticket.key, ticket.jiraUrl),
              notion.createRichText(' - '),
              notion.createRichText(ticket.summary),
              notion.createRichText(` (${ticket.assignee})`, { italic: true })
            ];
            
            toggleChildren.push(notion.createMixedParagraph(richText));
            childrenCount++;
          }

          if (childrenCount < maxToggleChildren) {
            toggleChildren.push(notion.createParagraphBlock(''));
            childrenCount++;
          }
        }
      }

      // Create toggle block with squad name and all tickets
      const totalTickets = backlogTickets.length;
      const toggleText = `${squad.displayName} (${totalTickets} backlog tickets)`;
      blocks.push(notion.createToggleBlock(toggleText, toggleChildren));
      blocks.push(notion.createParagraphBlock(''));
    });

    return blocks;
  }

  /**
   * Group changelog events by ticket
   */
  groupChangelogByTicket(events) {
    const grouped = {};
    
    for (const event of events) {
      if (!grouped[event.ticketKey]) {
        grouped[event.ticketKey] = {
          key: event.ticketKey,
          summary: event.ticketSummary,
          events: []
        };
      }
      grouped[event.ticketKey].events.push(event);
    }
    
    return Object.values(grouped);
  }

  /**
   * Group tickets by priority
   */
  groupTicketsByPriority(tickets) {
    const grouped = {
      'Highest': [],
      'High': [],
      'Medium': [],
      'Low': [],
      'Lowest': []
    };

    tickets.forEach(ticket => {
      const priority = ticket.priority || 'Medium';
      if (grouped[priority]) {
        grouped[priority].push(ticket);
      } else {
        grouped['Medium'].push(ticket);
      }
    });

    return grouped;
  }

  /**
   * Format changelog event for display
   */
  formatChangelogEvent(event) {
    if (event.type === 'comment') {
      // Truncate comment body if too long
      const commentBody = event.commentBody || '';
      const truncatedComment = commentBody.length > 100 
        ? commentBody.substring(0, 100) + '...' 
        : commentBody;
      return `added comment: "${truncatedComment}"`;
    }
    
    switch (event.field) {
      case 'status':
        return `changed status from "${event.fromString}" to "${event.toString}"`;
      case 'assignee':
        return `reassigned from "${event.fromString}" to "${event.toString}"`;
      case 'priority':
        return `changed priority from "${event.fromString}" to "${event.toString}"`;
      case 'summary':
        return `updated summary`;
      case 'description':
        return `updated description`;
      default:
        return `updated ${event.field}`;
    }
  }

  /**
   * Create a summary callout
   */
  createSummaryCallout(metrics) {
    const totalDone = Object.values(metrics).reduce((sum, squad) => sum + squad.done, 0);
    const totalStale = Object.values(metrics).reduce((sum, squad) => sum + squad.stale, 0);
    
    let message = `This week: ${totalDone} tickets completed`;
    
    if (totalStale > 0) {
      message += `, ${totalStale} tickets need attention`;
    }
    
    return notion.createCalloutBlock(message, '📈');
  }
}

module.exports = new NotionPageGenerator();
