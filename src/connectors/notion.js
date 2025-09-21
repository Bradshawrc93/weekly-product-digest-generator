const { Client } = require('@notionhq/client');
const config = require('../utils/config');
const { logger } = require('../utils/logger');

class NotionConnector {
  constructor() {
    this.client = new Client({ auth: config.notion.apiKey });
    this.databaseId = config.notion.databaseId;
  }

  /**
   * Test Notion connection
   */
  async testConnection() {
    try {
      const response = await this.client.databases.retrieve({
        database_id: this.databaseId
      });
      
      logger.info('Notion connection successful', { 
        databaseTitle: response.title[0]?.plain_text || 'Untitled',
        databaseId: this.databaseId 
      });
      
      return true;
    } catch (error) {
      logger.error('Notion connection failed', { 
        error: error.message,
        status: error.status 
      });
      return false;
    }
  }

  /**
   * Create a new page in the database
   */
  async createPage(pageData) {
    try {
      const response = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: pageData.title
                }
              }
            ]
          }
        },
        children: pageData.children
      });

      logger.info('Notion page created successfully', { 
        pageId: response.id,
        title: pageData.title 
      });

      return response;
    } catch (error) {
      logger.error('Failed to create Notion page', { 
        error: error.message,
        title: pageData.title 
      });
      throw error;
    }
  }

  /**
   * Create a table block
   */
  createTableBlock(headers, rows) {
    try {
      const tableRows = [headers, ...rows];
      
      return {
        object: 'block',
        type: 'table',
        table: {
          table_width: headers.length,
          has_column_header: true,
          has_row_header: false,
          children: tableRows.map(row => ({
            object: 'block',
            type: 'table_row',
            table_row: {
              cells: row.map(cell => [{
                type: 'text',
                text: {
                  content: cell.toString()
                }
              }])
            }
          }))
        }
      };
    } catch (error) {
      logger.error('Failed to create table block', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a heading block
   */
  createHeadingBlock(text, level = 1) {
    return {
      object: 'block',
      type: 'heading_' + level,
      [`heading_${level}`]: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: text
            }
          }
        ]
      }
    };
  }

  /**
   * Truncate text to fit within Notion's character limits
   */
  truncateText(text, maxLength = 2000) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Create a paragraph block
   */
  createParagraphBlock(text) {
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: this.truncateText(text)
            }
          }
        ]
      }
    };
  }

  /**
   * Create a bulleted list item
   */
  createBulletItem(text) {
    return {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: this.truncateText(text)
            }
          }
        ]
      }
    };
  }

  /**
   * Create a numbered list item
   */
  createNumberedItem(text) {
    return {
      object: 'block',
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: this.truncateText(text)
            }
          }
        ]
      }
    };
  }

  /**
   * Create a divider block
   */
  createDividerBlock() {
    return {
      object: 'block',
      type: 'divider',
      divider: {}
    };
  }

  /**
   * Create a callout block
   */
  createCalloutBlock(text, icon = '💡') {
    return {
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: text
            }
          }
        ],
        icon: {
          type: 'emoji',
          emoji: icon
        },
        color: 'default_background'
      }
    };
  }

  /**
   * Create a callout block with rich text
   */
  createRichTextCalloutBlock(richTextArray, icon = '💡') {
    return {
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: richTextArray,
        icon: {
          type: 'emoji',
          emoji: icon
        },
        color: 'default_background'
      }
    };
  }

  /**
   * Create a toggle block
   */
  createToggleBlock(text, children = []) {
    return {
      object: 'block',
      type: 'toggle',
      toggle: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: text
            }
          }
        ],
        children
      }
    };
  }

  /**
   * Create a quote block
   */
  createQuoteBlock(text) {
    return {
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: text
            }
          }
        ]
      }
    };
  }

  /**
   * Create a code block
   */
  createCodeBlock(code, language = 'plain text') {
    return {
      object: 'block',
      type: 'code',
      code: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: code
            }
          }
        ],
        language: language
      }
    };
  }

  /**
   * Create a bookmark block (for Jira links)
   */
  createBookmarkBlock(url, caption = '') {
    return {
      object: 'block',
      type: 'bookmark',
      bookmark: {
        url: url,
        caption: caption ? [
          {
            type: 'text',
            text: {
              content: caption
            }
          }
        ] : []
      }
    };
  }

  /**
   * Create rich text with link
   */
  createRichTextWithLink(text, url) {
    return {
      type: 'text',
      text: {
        content: text,
        link: {
          url: url
        }
      }
    };
  }

  /**
   * Create rich text with formatting
   */
  createRichText(text, annotations = {}) {
    return {
      type: 'text',
      text: {
        content: text
      },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: 'default',
        ...annotations
      }
    };
  }

  /**
   * Create a paragraph with mixed content (text and links)
   */
  createMixedParagraph(richTextArray) {
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: richTextArray
      }
    };
  }

  /**
   * Update an existing page
   */
  async updatePage(pageId, children) {
    try {
      const response = await this.client.blocks.children.append({
        block_id: pageId,
        children: children
      });

      logger.info('Notion page updated successfully', { pageId });
      return response;
    } catch (error) {
      logger.error('Failed to update Notion page', { 
        error: error.message,
        pageId 
      });
      throw error;
    }
  }

  /**
   * Get page content
   */
  async getPageContent(pageId) {
    try {
      const response = await this.client.blocks.children.list({
        block_id: pageId
      });

      return response.results;
    } catch (error) {
      logger.error('Failed to get page content', { 
        error: error.message,
        pageId 
      });
      throw error;
    }
  }

  /**
   * Append blocks to an existing page
   */
  async appendBlocksToPage(pageId, blocks) {
    try {
      const response = await this.client.blocks.children.append({
        block_id: pageId,
        children: blocks
      });

      logger.info('Blocks appended to Notion page successfully', { 
        pageId, 
        blocksAdded: blocks.length 
      });
      return response;
    } catch (error) {
      logger.error('Failed to append blocks to Notion page', { 
        error: error.message,
        pageId,
        blocksCount: blocks.length
      });
      throw error;
    }
  }

  /**
   * Delete a page
   */
  async deletePage(pageId) {
    try {
      await this.client.pages.update({
        page_id: pageId,
        archived: true
      });

      logger.info('Notion page archived successfully', { pageId });
      return true;
    } catch (error) {
      logger.error('Failed to archive Notion page', { 
        error: error.message,
        pageId 
      });
      throw error;
    }
  }
}

module.exports = new NotionConnector();
