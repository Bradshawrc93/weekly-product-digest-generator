const notion = require('../connectors/notion');
const config = require('../utils/config');
const { logger } = require('../utils/logger');

class NotionPageGenerator {
  constructor() {
    this.squads = config.squads;
    this.maxBlocks = 95; // Leave some buffer below Notion's 100 limit
  }

  /**
   * Generate the complete weekly report page
   */
  async generateWeeklyReport(dateRange, metrics, organizedData) {
    try {
      logger.info('Generating Notion page', { dateRange: dateRange.display });

      const pageData = {
        title: `Weekly Report: ${dateRange.display}`,
        children: []
      };

      let blockCount = 0;

      // AI TL;DR section
      const aiTldrBlocks = this.createAITLDRSection(metrics, organizedData);
      pageData.children.push(...aiTldrBlocks);
      blockCount += aiTldrBlocks.length;

      // Divider
      pageData.children.push(notion.createDividerBlock());
      blockCount += 1;

      // What Shipped section
      const whatShippedBlocks = this.createWhatShippedSection(organizedData);
      pageData.children.push(...whatShippedBlocks);
      blockCount += whatShippedBlocks.length;

      // Divider
      pageData.children.push(notion.createDividerBlock());
      blockCount += 1;

      // Change Log section (with block limit)
      const changeLogBlocks = this.createChangeLogSection(organizedData, blockCount);
      pageData.children.push(...changeLogBlocks);
      blockCount += changeLogBlocks.length;

      // Only add remaining sections if we have room
      if (blockCount < this.maxBlocks - 20) { // Reserve 20 blocks for remaining sections
        // Divider
        pageData.children.push(notion.createDividerBlock());
        blockCount += 1;

        // Stale tickets section
        const staleBlocks = this.createStaleTicketsSection(organizedData);
        pageData.children.push(...staleBlocks);
        blockCount += staleBlocks.length;

        // Divider
        pageData.children.push(notion.createDividerBlock());
        blockCount += 1;

        // Blocked tickets section
        const blockedBlocks = this.createBlockedTicketsSection(organizedData);
        pageData.children.push(...blockedBlocks);
        blockCount += blockedBlocks.length;

        // Divider
        pageData.children.push(notion.createDividerBlock());
        blockCount += 1;

        // On Deck section
        const onDeckBlocks = this.createOnDeckSection(organizedData);
        pageData.children.push(...onDeckBlocks);
        blockCount += onDeckBlocks.length;
      }

      logger.info('Page generation complete', { 
        totalBlocks: blockCount,
        title: pageData.title 
      });

      const response = await notion.createPage(pageData);
      
      logger.info('Weekly report page generated successfully', { 
        pageId: response.id,
        title: pageData.title,
        totalBlocks: blockCount
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
  createAITLDRSection(metrics, organizedData) {
    const aiSummary = this.generateAITLDRSummary(metrics, organizedData);
    
    return [
      notion.createHeadingBlock('🤖 AI TL;DR', 1),
      notion.createCalloutBlock(aiSummary, '🚀'),
      notion.createParagraphBlock('')
    ];
  }

  /**
   * Generate AI TL;DR summary based on data
   */
  generateAITLDRSummary(metrics, organizedData) {
    try {
      // Calculate key metrics
      const totalDone = Object.values(metrics).reduce((sum, squad) => sum + squad.done, 0);
      const totalStale = Object.values(metrics).reduce((sum, squad) => sum + squad.stale, 0);
      const totalBlocked = Object.values(metrics).reduce((sum, squad) => sum + squad.blocked, 0);
      const totalCreated = Object.values(metrics).reduce((sum, squad) => sum + squad.created, 0);
      const totalUpdated = Object.values(metrics).reduce((sum, squad) => sum + squad.updated, 0);

      // Find most and least active squads
      let mostActiveSquad = null;
      let leastActiveSquad = null;
      let maxActivity = 0;
      let minActivity = Infinity;

      Object.entries(metrics).forEach(([squadName, squadMetrics]) => {
        const activity = squadMetrics.done + squadMetrics.updated + squadMetrics.created;
        if (activity > maxActivity) {
          maxActivity = activity;
          mostActiveSquad = squadName;
        }
        if (activity < minActivity && activity > 0) {
          minActivity = activity;
          leastActiveSquad = squadName;
        }
      });

      // Find squads with most stale tickets
      const staleBySquad = Object.entries(metrics)
        .filter(([_, squadMetrics]) => squadMetrics.stale > 0)
        .sort(([_, a], [__, b]) => b.stale - a.stale);

      // Generate summary
      let summary = `Team activity was ${totalDone > 5 ? 'strong' : totalDone > 2 ? 'moderate' : 'minimal'} this week with ${totalDone} tickets completed across all squads. `;
      
      if (mostActiveSquad) {
        const squadMetrics = metrics[mostActiveSquad];
        summary += `${mostActiveSquad} squad led productivity with ${squadMetrics.done} completion${squadMetrics.done !== 1 ? 's' : ''} and ${squadMetrics.updated} update${squadMetrics.updated !== 1 ? 's' : ''}. `;
      }

      if (totalStale > 0) {
        summary += `The concerning trend is ${totalStale} stale tickets across multiple squads`;
        if (staleBySquad.length > 0) {
          const topStaleSquad = staleBySquad[0];
          summary += `, with ${topStaleSquad[0]} leading at ${topStaleSquad[1].stale} stale tickets`;
        }
        summary += '. ';
      }

      if (totalBlocked === 0) {
        summary += 'No blocked tickets is positive. ';
      } else {
        summary += `${totalBlocked} blocked tickets need immediate attention. `;
      }

      if (totalStale > 10) {
        summary += 'Immediate attention needed on workflow bottlenecks and stale ticket resolution.';
      } else if (totalStale > 5) {
        summary += 'Some attention needed on stale ticket management.';
      } else {
        summary += 'Overall workflow appears healthy.';
      }

      return summary;
    } catch (error) {
      logger.error('Failed to generate AI TL;DR summary', { error: error.message });
      return 'AI summary generation failed. Please check the data and try again.';
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
  createWhatShippedSection(organizedData) {
    const blocks = [
      notion.createHeadingBlock('🚢 What Shipped', 1)
    ];

    for (const squad of this.squads) {
      const squadData = organizedData[squad.name];
      const completedTickets = squadData?.completedTickets || [];

      if (completedTickets.length > 0) {
        // Squad header
        blocks.push(
          notion.createHeadingBlock(squad.displayName, 2)
        );

        // Completed tickets
        completedTickets.forEach(ticket => {
          const richText = [
            notion.createRichTextWithLink(ticket.key, ticket.jiraUrl),
            notion.createRichText(' - '),
            notion.createRichText(ticket.summary),
            notion.createRichText(` (${ticket.assignee})`, { italic: true })
          ];
          
          blocks.push(notion.createMixedParagraph(richText));
        });

        blocks.push(notion.createParagraphBlock(''));
      }
    }

    if (blocks.length === 1) {
      blocks.push(notion.createParagraphBlock('No tickets were completed this week.'));
    }

    return blocks;
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
    const maxChangelogBlocks = Math.max(remainingBlocks, 30); // Minimum 30 blocks for changelog

    logger.info('Changelog block allocation', { 
      currentBlocks: currentBlockCount,
      remainingBlocks,
      maxChangelogBlocks
    });

    // Show squads with events in compact format, limiting total blocks
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
      
      // Calculate blocks needed for this squad
      const squadBlocksNeeded = 2 + (groupedEvents.length * 2); // Squad header + ticket blocks
      
      if (blocksUsed + squadBlocksNeeded > maxChangelogBlocks) {
        // Show summary for this squad instead of all events
        blocks.push(
          notion.createHeadingBlock(`${squad.displayName}`, 2)
        );
        blocks.push(
          notion.createParagraphBlock(`${groupedEvents.length} tickets had updates this week.`)
        );
        blocksUsed += 2;
        squadsShown++;
        continue;
      }

      // Squad header
      blocks.push(
        notion.createHeadingBlock(`${squad.displayName}`, 2)
      );
      blocksUsed += 1;

      // Show tickets with events (limited)
      for (const ticketGroup of groupedEvents) {
        if (blocksUsed >= maxChangelogBlocks) {
          break;
        }

        // Ticket header
        const ticketHeader = [
          notion.createRichTextWithLink(ticketGroup.key, `${config.jira.baseUrl}/browse/${ticketGroup.key}`),
          notion.createRichText(' - '),
          notion.createRichText(ticketGroup.summary, { bold: true })
        ];
        blocks.push(notion.createMixedParagraph(ticketHeader));
        blocksUsed += 1;

        // Show first event for this ticket
        if (ticketGroup.events.length > 0) {
          const event = ticketGroup.events[0];
          const eventText = `${event.displayDate} - ${event.author} ${this.formatChangelogEvent(event)}`;
          blocks.push(notion.createBulletItem(eventText));
          blocksUsed += 1;
          eventsShown++;
        }
      }

      squadsShown++;
    }

    // Add summary if we had to truncate
    if (squadsShown < squadsWithEvents.length) {
      blocks.push(notion.createParagraphBlock(''));
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
  createStaleTicketsSection(organizedData) {
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
  createBlockedTicketsSection(organizedData) {
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

      // Create toggle children for all backlog tickets
      const toggleChildren = [];

      // Group by priority
      const groupedByPriority = this.groupTicketsByPriority(backlogTickets);
      
      for (const [priority, tickets] of Object.entries(groupedByPriority)) {
        if (tickets.length > 0) {
          toggleChildren.push(
            notion.createHeadingBlock(`${priority} Priority`, 3)
          );

          // Show all tickets per priority
          tickets.forEach(ticket => {
            const richText = [
              notion.createRichTextWithLink(ticket.key, ticket.jiraUrl),
              notion.createRichText(' - '),
              notion.createRichText(ticket.summary),
              notion.createRichText(` (${ticket.assignee})`, { italic: true })
            ];
            
            toggleChildren.push(notion.createMixedParagraph(richText));
          });

          toggleChildren.push(notion.createParagraphBlock(''));
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
