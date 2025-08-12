const notion = require('../connectors/notion');
const config = require('../utils/config');
const { logger } = require('../utils/logger');

class NotionPageGenerator {
  constructor() {
    this.squads = config.squads;
  }

  /**
   * Generate the complete weekly report page
   */
  async generateWeeklyReport(dateRange, metrics, organizedData) {
    try {
      logger.info('Generating Notion page', { dateRange: dateRange.display });

      const pageData = {
        title: `Weekly Report: ${dateRange.display}`,
        children: [
          // AI TL;DR placeholder
          ...this.createAITLDRSection(),
          
          // Metrics table
          ...this.createMetricsTable(metrics),
          
          // Divider
          notion.createDividerBlock(),
          
          // What Shipped section
          ...this.createWhatShippedSection(organizedData),
          
          // Divider
          notion.createDividerBlock(),
          
          // Change Log section
          ...this.createChangeLogSection(organizedData),
          
          // Divider
          notion.createDividerBlock(),
          
          // Stale tickets section
          ...this.createStaleTicketsSection(organizedData),
          
          // Divider
          notion.createDividerBlock(),
          
          // On Deck section
          ...this.createOnDeckSection(organizedData)
        ]
      };

      const response = await notion.createPage(pageData);
      
      logger.info('Weekly report page generated successfully', { 
        pageId: response.id,
        title: pageData.title 
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate weekly report page', { error: error.message });
      throw error;
    }
  }

  /**
   * Create AI TL;DR section (placeholder)
   */
  createAITLDRSection() {
    return [
      notion.createHeadingBlock('🤖 AI TL;DR', 1),
      notion.createCalloutBlock(
        'AI-powered summary coming soon! This section will provide intelligent insights and key highlights from the weekly data.',
        '🚀'
      ),
      notion.createParagraphBlock('')
    ];
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
        ['In-Progress', ...this.squads.map(squad => metrics[squad.name]?.inProgress || 0)]
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
          notion.createHeadingBlock(`**${squad.displayName}**`, 2)
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
  createChangeLogSection(organizedData) {
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

    // Show all squads with events in compact format
    squadsWithEvents.forEach(squad => {
      const squadData = organizedData[squad.name];
      const changelogEvents = squadData?.changelogEvents || [];

      // Squad header
      blocks.push(
        notion.createHeadingBlock(`**${squad.displayName}**`, 2)
      );

      // Group events by ticket
      const groupedEvents = this.groupChangelogByTicket(changelogEvents);
      
      // Show first ticket with events
      if (groupedEvents.length > 0) {
        const ticketGroup = groupedEvents[0];
        
        // Ticket header
        const ticketHeader = [
          notion.createRichTextWithLink(ticketGroup.key, `${config.jira.baseUrl}/browse/${ticketGroup.key}`),
          notion.createRichText(' - '),
          notion.createRichText(ticketGroup.summary, { bold: true })
        ];
        blocks.push(notion.createMixedParagraph(ticketHeader));

        // Show first event for this ticket
        if (ticketGroup.events.length > 0) {
          const event = ticketGroup.events[0];
          const eventText = `${event.displayDate} - ${event.author} ${this.formatChangelogEvent(event)}`;
          blocks.push(notion.createBulletItem(eventText));
        }

        blocks.push(notion.createParagraphBlock(''));
      }
      
      // Add summary of remaining activity
      if (groupedEvents.length > 1) {
        blocks.push(notion.createParagraphBlock(`... and ${groupedEvents.length - 1} more tickets with changes.`));
      }
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

    // Show all squads with stale tickets in compact format
    squadsWithStale.forEach(squad => {
      const squadData = organizedData[squad.name];
      const staleTickets = squadData?.staleTickets || [];

      // Squad header
      blocks.push(
        notion.createHeadingBlock(`**${squad.displayName}**`, 2)
      );

      // Show first 2 stale tickets
      const limitedStaleTickets = staleTickets.slice(0, 2);
      
      // Stale tickets
      limitedStaleTickets.forEach(ticket => {
        const richText = [
          notion.createRichTextWithLink(ticket.key, ticket.jiraUrl),
          notion.createRichText(' - '),
          notion.createRichText(ticket.summary),
          notion.createRichText(` (${ticket.assignee})`, { italic: true }),
          notion.createRichText(` - ${ticket.daysStale} days stale`, { color: 'red_background' })
        ];
        
        blocks.push(notion.createMixedParagraph(richText));
      });
      
      // Add note if there were more stale tickets
      if (staleTickets.length > 2) {
        blocks.push(notion.createParagraphBlock(`... and ${staleTickets.length - 2} more stale tickets.`));
      }

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

    // Limit to first 1 squad with backlog (to leave room for others)
    const limitedSquads = squadsWithBacklog.slice(0, 1);

    for (const squad of limitedSquads) {
      const squadData = organizedData[squad.name];
      const backlogTickets = squadData?.backlogTickets || [];

      // Squad header
      blocks.push(
        notion.createHeadingBlock(`**${squad.displayName}**`, 2)
      );

      // Group by priority
      const groupedByPriority = this.groupTicketsByPriority(backlogTickets);
      
      for (const [priority, tickets] of Object.entries(groupedByPriority)) {
        if (tickets.length > 0) {
          blocks.push(
            notion.createHeadingBlock(`${priority} Priority`, 3)
          );

          // Limit to first 5 tickets per priority
          const limitedTickets = tickets.slice(0, 5);
          
          limitedTickets.forEach(ticket => {
            const richText = [
              notion.createRichTextWithLink(ticket.key, ticket.jiraUrl),
              notion.createRichText(' - '),
              notion.createRichText(ticket.summary),
              notion.createRichText(` (${ticket.assignee})`, { italic: true })
            ];
            
            blocks.push(notion.createMixedParagraph(richText));
          });
          
          // Add note if there were more tickets
          if (tickets.length > 5) {
            blocks.push(notion.createParagraphBlock(`... and ${tickets.length - 5} more ${priority.toLowerCase()} priority tickets.`));
          }

          blocks.push(notion.createParagraphBlock(''));
        }
      }
    }

    // Add detailed sections for remaining squads with backlog tickets
    if (squadsWithBacklog.length > 1) {
      const remainingSquads = squadsWithBacklog.slice(1);
      blocks.push(notion.createHeadingBlock('**Other Squads with Backlog**', 2));
      
      remainingSquads.forEach(squad => {
        const squadData = organizedData[squad.name];
        const backlogTickets = squadData?.backlogTickets || [];

        // Squad header
        blocks.push(
          notion.createHeadingBlock(`**${squad.displayName}**`, 2)
        );

        // Group by priority
        const groupedByPriority = this.groupTicketsByPriority(backlogTickets);
        
        for (const [priority, tickets] of Object.entries(groupedByPriority)) {
          if (tickets.length > 0) {
            blocks.push(
              notion.createHeadingBlock(`${priority} Priority`, 3)
            );

            // Limit to first 3 tickets per priority
            const limitedTickets = tickets.slice(0, 3);
            
            limitedTickets.forEach(ticket => {
              const richText = [
                notion.createRichTextWithLink(ticket.key, ticket.jiraUrl),
                notion.createRichText(' - '),
                notion.createRichText(ticket.summary),
                notion.createRichText(` (${ticket.assignee})`, { italic: true })
              ];
              
              blocks.push(notion.createMixedParagraph(richText));
            });
            
            // Add note if there were more tickets
            if (tickets.length > 3) {
              blocks.push(notion.createParagraphBlock(`... and ${tickets.length - 3} more ${priority.toLowerCase()} priority tickets.`));
            }

            blocks.push(notion.createParagraphBlock(''));
          }
        }
      });
    }

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
