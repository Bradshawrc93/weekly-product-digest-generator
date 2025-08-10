const { logger } = require('../utils/logger');
const { Client } = require('@notionhq/client');
const moment = require('moment');

class NotionPublisher {
  constructor() {
    this.client = new Client({ auth: process.env.NOTION_API_KEY });
    this.databaseId = process.env.NOTION_DATABASE_ID;
  }

  async publishSquadDigest(data) {
    const { squad, digest, insights, dateRange } = data;
    
    logger.logSquad('info', 'Publishing squad digest to Notion', squad.name);
    
    try {
      const pageId = await this.createSquadPage(squad, digest, insights, dateRange);
      
      logger.logSquad('info', 'Squad digest published successfully', squad.name, { pageId });
      
      return { pageId };
    } catch (error) {
      logger.logSquad('error', 'Failed to publish squad digest', squad.name, { error: error.message });
      throw error;
    }
  }

  async publishExecutiveRollup(data) {
    const { squadResults, rollupSummary, dateRange } = data;
    
    logger.info('Publishing executive rollup to Notion');
    
    try {
      const pageId = await this.createRollupPage(squadResults, rollupSummary, dateRange);
      
      logger.info('Executive rollup published successfully', { pageId });
      
      return { pageId };
    } catch (error) {
      logger.error('Failed to publish executive rollup', { error: error.message });
      throw error;
    }
  }

  async createSquadPage(squad, digest, insights, dateRange) {
    logger.debug('Creating squad page', { squad: squad.name });
    
    try {
      const properties = this.buildPageProperties(squad, insights, dateRange);
      const content = this.buildContentBlocks(digest, insights, squad);
      
      const response = await this.client.pages.create({
        parent: {
          database_id: this.databaseId
        },
        properties: properties,
        children: content
      });
      
      return response.id;
    } catch (error) {
      logger.logSquad('error', 'Failed to create squad page', squad.name, { error: error.message });
      throw error;
    }
  }

  async createRollupPage(squadResults, rollupSummary, dateRange) {
    logger.debug('Creating rollup page');
    
    try {
      const properties = this.buildRollupProperties(squadResults, dateRange);
      const content = this.buildRollupContent(squadResults, rollupSummary, dateRange);
      
      const response = await this.client.pages.create({
        parent: {
          database_id: this.databaseId
        },
        properties: properties,
        children: content
      });
      
      return response.id;
    } catch (error) {
      logger.error('Failed to create rollup page', { error: error.message });
      throw error;
    }
  }

  buildPageProperties(squad, insights, dateRange) {
    return {
      'Squad': {
        title: [
          {
            text: {
              content: squad.name
            }
          }
        ]
      },
      'Week Start': {
        date: {
          start: dateRange.startDate.format('YYYY-MM-DD')
        }
      },
      'Week End': {
        date: {
          start: dateRange.endDate.format('YYYY-MM-DD')
        }
      },
      'Velocity': {
        number: insights.velocity.velocity || 0
      },
      'Shipped Count': {
        number: insights.velocity.completedIssues || 0
      },
      'Risk Count': {
        number: insights.risks.totalRisks || 0
      },
      'Status': {
        select: {
          name: 'Complete'
        }
      }
    };
  }

  buildRollupProperties(squadResults, dateRange) {
    const totalIssues = squadResults.reduce((sum, result) => sum + result.issues.length, 0);
    const totalPRs = squadResults.reduce((sum, result) => sum + result.prs.length, 0);
    const avgVelocity = squadResults.reduce((sum, result) => sum + (result.insights?.velocity?.velocity || 0), 0) / squadResults.length;
    
    return {
      'Squad': {
        title: [
          {
            text: {
              content: 'Executive Roll-Up'
            }
          }
        ]
      },
      'Week Start': {
        date: {
          start: dateRange.startDate.format('YYYY-MM-DD')
        }
      },
      'Week End': {
        date: {
          start: dateRange.endDate.format('YYYY-MM-DD')
        }
      },
      'Velocity': {
        number: avgVelocity || 0
      },
      'Shipped Count': {
        number: totalIssues || 0
      },
      'Risk Count': {
        number: 0 // Would need to calculate total risks
      },
      'Status': {
        select: {
          name: 'Complete'
        }
      }
    };
  }

  buildContentBlocks(digest, insights, squad) {
    const blocks = [];
    
    // TL;DR Section
    blocks.push({
      type: 'heading_1',
      heading_1: {
        rich_text: [
          {
            text: {
              content: 'TL;DR'
            }
          }
        ]
      }
    });
    
    digest.tldr.forEach(item => {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: item
              }
            }
          ]
        }
      });
    });
    
    // What Shipped Section
    blocks.push({
      type: 'heading_1',
      heading_1: {
        rich_text: [
          {
            text: {
              content: 'What Shipped'
            }
          }
        ]
      }
    });
    
    digest.shipped.forEach(item => {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: item
              }
            }
          ]
        }
      });
    });
    
    // Work in Flight Section
    blocks.push({
      type: 'heading_1',
      heading_1: {
        rich_text: [
          {
            text: {
              content: 'Work in Flight'
            }
          }
        ]
      }
    });
    
    digest.inFlight.forEach(item => {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: item
              }
            }
          ]
        }
      });
    });
    
    // Risks & Blockers Section
    blocks.push({
      type: 'heading_1',
      heading_1: {
        rich_text: [
          {
            text: {
              content: 'Risks & Blockers'
            }
          }
        ]
      }
    });
    
    if (insights.risks.totalRisks > 0) {
      blocks.push({
        type: 'callout',
        callout: {
          icon: {
            emoji: '⚠️'
          },
          rich_text: [
            {
              text: {
                content: `${insights.risks.totalRisks} risks identified with ${insights.risks.highRiskEpics.length} high-risk epics`
              }
            }
          ],
          color: 'yellow_background'
        }
      });
    }
    
    digest.risks.forEach(item => {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: item
              }
            }
          ]
        }
      });
    });
    
    // Decisions Section
    blocks.push({
      type: 'heading_1',
      heading_1: {
        rich_text: [
          {
            text: {
              content: 'Decisions'
            }
          }
        ]
      }
    });
    
    digest.decisions.forEach(item => {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: item
              }
            }
          ]
        }
      });
    });
    
    // Roadmap Snapshot Section
    blocks.push({
      type: 'heading_1',
      heading_1: {
        rich_text: [
          {
            text: {
              content: 'Roadmap Snapshot'
            }
          }
        ]
      }
    });
    
    blocks.push({
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            text: {
              content: digest.roadmap
            }
          }
        ]
      }
    });
    
    // Metrics Summary
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: 'Metrics Summary'
            }
          }
        ]
      }
    });
    
    blocks.push({
      type: 'table',
      table: {
        table_width: 4,
        children: [
          {
            type: 'table_row',
            table_row: {
              cells: [
                [{ text: { content: 'Metric' } }],
                [{ text: { content: 'Value' } }],
                [{ text: { content: 'Target' } }],
                [{ text: { content: 'Status' } }]
              ]
            }
          },
          {
            type: 'table_row',
            table_row: {
              cells: [
                [{ text: { content: 'Velocity' } }],
                [{ text: { content: `${(insights.velocity.velocity * 100).toFixed(1)}%` } }],
                [{ text: { content: '80%' } }],
                [{ text: { content: insights.velocity.velocity >= 0.8 ? '✅' : '⚠️' } }]
              ]
            }
          },
          {
            type: 'table_row',
            table_row: {
              cells: [
                [{ text: { content: 'Issues Completed' } }],
                [{ text: { content: insights.velocity.completedIssues.toString() } }],
                [{ text: { content: 'N/A' } }],
                [{ text: { content: '📊' } }]
              ]
            }
          },
          {
            type: 'table_row',
            table_row: {
              cells: [
                [{ text: { content: 'Risk Score' } }],
                [{ text: { content: `${(insights.risks.riskScore * 100).toFixed(1)}%` } }],
                [{ text: { content: '<30%' } }],
                [{ text: { content: insights.risks.riskScore <= 0.3 ? '✅' : '⚠️' } }]
              ]
            }
          }
        ]
      }
    });
    
    return blocks;
  }

  buildRollupContent(squadResults, rollupSummary, dateRange) {
    const blocks = [];
    
    // Executive Summary
    blocks.push({
      type: 'heading_1',
      heading_1: {
        rich_text: [
          {
            text: {
              content: 'Executive Summary'
            }
          }
        ]
      }
    });
    
    rollupSummary.highlights.forEach(item => {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: item
              }
            }
          ]
        }
      });
    });
    
    // Squad Links
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: 'Squad Digests'
            }
          }
        ]
      }
    });
    
    squadResults.forEach(result => {
      if (result.notionPageId) {
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                text: {
                  content: result.squad
                }
              },
              {
                text: {
                  content: ' - ',
                  annotations: {
                    color: 'gray'
                  }
                }
              },
              {
                text: {
                  content: `${result.issues} issues, ${result.prs} PRs, ${(result.insights?.velocity?.velocity * 100).toFixed(1)}% velocity`,
                  annotations: {
                    color: 'blue'
                  }
                }
              }
            ]
          }
        });
      }
    });
    
    // Cross-Squad Dependencies
    if (rollupSummary.dependencies.length > 0) {
      blocks.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              text: {
                content: 'Cross-Squad Dependencies'
              }
            }
          ]
        }
      });
      
      rollupSummary.dependencies.forEach(item => {
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                text: {
                  content: item
                }
              }
            ]
          }
        });
      });
    }
    
    // Strategic Insights
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: 'Strategic Insights'
            }
          }
        ]
      }
    });
    
    rollupSummary.insights.forEach(item => {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: item
              }
            }
          ]
        }
      });
    });
    
    return blocks;
  }
}

module.exports = { NotionPublisher };
