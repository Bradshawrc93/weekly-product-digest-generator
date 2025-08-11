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

  async publishWeeklySummary(data) {
    const { squadResults, rollupSummary, dateRange, globalSettings } = data;
    
    logger.info('Publishing weekly summary to Notion');
    
    try {
      const pageId = await this.createWeeklySummaryPage(squadResults, rollupSummary, dateRange, globalSettings);
      
      logger.info('Weekly summary published successfully', { pageId });
      
      return { pageId };
    } catch (error) {
      logger.error('Failed to publish weekly summary', { error: error.message });
      throw error;
    }
  }

  async createSquadPage(squad, digest, insights, dateRange) {
    logger.debug('Creating squad page', { squad: squad.name });
    
    try {
      const properties = this.buildSquadPageProperties(squad, insights, dateRange);
      const content = this.buildSquadContentBlocks(digest, insights, squad);
      
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

  async createWeeklySummaryPage(squadResults, rollupSummary, dateRange, globalSettings) {
    logger.debug('Creating weekly summary page');
    
    try {
      const properties = this.buildWeeklySummaryProperties(squadResults, dateRange);
      const content = this.buildWeeklySummaryContent(squadResults, rollupSummary, dateRange, globalSettings);
      
      const response = await this.client.pages.create({
        parent: {
          database_id: this.databaseId
        },
        properties: properties,
        children: content
      });
      
      return response.id;
    } catch (error) {
      logger.error('Failed to create weekly summary page', { error: error.message });
      throw error;
    }
  }

  buildSquadPageProperties(squad, insights, dateRange) {
    const weekRange = `${dateRange.startDate.format('MMM D')} - ${dateRange.endDate.format('MMM D, YYYY')}`;
    
    return {
      'Name': {
        title: [
          {
            text: {
              content: `${weekRange} - ${squad.name}`
            }
          }
        ]
      }
      // Created Time, Created by, and Last Edited by are auto-populated by Notion
    };
  }

  buildWeeklySummaryProperties(squadResults, dateRange) {
    const weekRange = `${dateRange.startDate.format('MMM D')} - ${dateRange.endDate.format('MMM D, YYYY')}`;
    
    return {
      'Name': {
        title: [
          {
            text: {
              content: `Weekly Digest: ${weekRange}`
            }
          }
        ]
      }
      // Created Time, Created by, and Last Edited by are auto-populated by Notion
    };
  }

  buildSquadContentBlocks(digest, insights, squad) {
    const blocks = [];
    
    // Squad Header
    blocks.push({
      type: 'heading_1',
      heading_1: {
        rich_text: [
          {
            text: {
              content: `${squad.name} - Weekly Digest`
            }
          }
        ]
      }
    });

    // Executive Summary
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '📊 Executive Summary'
            }
          }
        ]
      }
    });

    // Key Metrics Callout
    blocks.push({
      type: 'callout',
      callout: {
        icon: {
          emoji: '📈'
        },
        rich_text: [
          {
            text: {
              content: `Velocity: ${(insights.velocity.velocity * 100).toFixed(1)}% | Issues Completed: ${insights.velocity.completedIssues} | Risk Score: ${(insights.risks.riskScore * 100).toFixed(1)}%`
            }
          }
        ],
        color: 'blue_background'
      }
    });
    
    // TL;DR Section
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '🎯 TL;DR'
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
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '🚀 What Shipped'
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
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '🔄 Work in Flight'
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
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '⚠️ Risks & Blockers'
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
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '💬 Key Decisions'
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
    
    // Workstream Insights
    if (insights.workstreamInsights && Object.keys(insights.workstreamInsights).length > 0) {
      blocks.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              text: {
                content: '📋 Workstream Summary'
              }
            }
          ]
        }
      });

      Object.values(insights.workstreamInsights).forEach(workstream => {
        blocks.push({
          type: 'callout',
          callout: {
            icon: {
              emoji: '📊'
            },
            rich_text: [
              {
                text: {
                  content: `${workstream.name}: ${workstream.totalIssues} issues, ${(workstream.completionRate * 100).toFixed(1)}% complete, ${workstream.epicCount} epics`
                }
              }
            ],
            color: 'gray_background'
          }
        });
      });
    }
    
    return blocks;
  }

  buildWeeklySummaryContent(squadResults, rollupSummary, dateRange, globalSettings) {
    const blocks = [];
    
    // Weekly Summary Header
    blocks.push({
      type: 'heading_1',
      heading_1: {
        rich_text: [
          {
            text: {
              content: '📊 Weekly Product Operations Digest'
            }
          }
        ]
      }
    });

    // Executive Summary
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '🎯 Executive Summary'
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

    // Company-wide Metrics
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '📈 Company-wide Metrics'
            }
          }
        ]
      }
    });

    const totalIssues = squadResults.reduce((sum, result) => sum + result.issues.length, 0);
    const totalPRs = squadResults.reduce((sum, result) => sum + result.prs.length, 0);
    const totalDecisions = squadResults.reduce((sum, result) => sum + result.decisions.length, 0);
    const avgVelocity = squadResults.reduce((sum, result) => sum + (result.insights?.velocity?.velocity || 0), 0) / squadResults.length;

    blocks.push({
      type: 'callout',
      callout: {
        icon: {
          emoji: '📊'
        },
        rich_text: [
          {
            text: {
              content: `Total Issues: ${totalIssues} | Total PRs: ${totalPRs} | Total Decisions: ${totalDecisions} | Average Velocity: ${(avgVelocity * 100).toFixed(1)}%`
            }
          }
        ],
        color: 'blue_background'
      }
    });

    // Squad Performance
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '👥 Squad Performance'
            }
          }
        ]
      }
    });

    squadResults.forEach(result => {
      const velocity = (result.insights?.velocity?.velocity * 100).toFixed(1) || '0.0';
      const riskScore = (result.insights?.risks?.riskScore * 100).toFixed(1) || '0.0';
      
      blocks.push({
        type: 'callout',
        callout: {
          icon: {
            emoji: '👥'
          },
          rich_text: [
            {
              text: {
                content: `${result.squad}: ${result.issues.length} issues, ${result.prs.length} PRs, ${velocity}% velocity, ${riskScore}% risk score`
              }
            }
          ],
          color: 'gray_background'
        }
      });
    });

    // Key Conversations & Decisions
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '💬 Key Conversations & Decisions'
            }
          }
        ]
      }
    });

    // Aggregate decisions from all squads
    const allDecisions = squadResults.flatMap(result => result.decisions || []);
    const uniqueDecisions = allDecisions.slice(0, 10); // Top 10 decisions

    uniqueDecisions.forEach(decision => {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: `${decision.text} (${decision.owner})`
              }
            }
          ]
        }
      });
    });

    // Cross-Squad Dependencies
    if (rollupSummary.dependencies.length > 0) {
      blocks.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              text: {
                content: '🔗 Cross-Squad Dependencies'
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
              content: '🎯 Strategic Insights'
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

    // Squad Links
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '📋 Detailed Squad Reports'
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
                  content: `${result.squad} - `,
                  annotations: {
                    color: 'gray'
                  }
                }
              },
              {
                text: {
                  content: `${result.issues.length} issues, ${result.prs.length} PRs, ${(result.insights?.velocity?.velocity * 100).toFixed(1)}% velocity`,
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

    return blocks;
  }
}

module.exports = { NotionPublisher };
