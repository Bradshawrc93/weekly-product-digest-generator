require('dotenv').config();
const { NotionPublisher } = require('../src/publishers/notion');
const moment = require('moment');

async function testFormattedNotionPage() {
  console.log('🎨 Testing Formatted Notion Page Generation...\n');
  
  try {
    const notionPublisher = new NotionPublisher();
    
    // Create sample data
    const startDate = moment().subtract(8, 'days');
    const endDate = moment();
    const generatedTime = moment().format('MMM DD, YYYY [at] h:mm A');
    
    // Sample squad data
    const sampleSquadData = [
      {
        squad: { name: 'Voice' },
        jiraData: {
          issues: [
            {
              key: 'PO-123',
              fields: {
                summary: 'Implement voice API integration',
                status: { name: 'In Progress' },
                assignee: { displayName: 'John Doe' },
                customfield_10030: 5
              }
            },
            {
              key: 'PO-124',
              fields: {
                summary: 'Voice UI components',
                status: { name: 'Done' },
                assignee: { displayName: 'Jane Smith' },
                customfield_10030: 3
              }
            }
          ]
        },
        slackData: {
          decisions: [
            {
              topic: 'Voice API Architecture',
              decision: 'Use WebRTC for real-time communication',
              rationale: 'Better performance and browser compatibility'
            }
          ],
          risks: [
            {
              topic: 'Voice Quality',
              description: 'Potential audio quality issues in low-bandwidth scenarios',
              mitigation: 'Implement adaptive bitrate streaming'
            }
          ],
          launches: [
            {
              topic: 'Voice Beta Release',
              description: 'Planning beta release for next quarter'
            }
          ]
        },
        teamSummary: {
          totalIssues: 2,
          issuesWithChanges: 2,
          newItems: 1,
          totalChanges: 5,
          activityLevel: 'High',
          statusChanges: 2,
          assigneeChanges: 1,
          storyPointChanges: 1,
          priorityChanges: 0,
          comments: 1,
          mostActiveIssues: [
            {
              key: 'PO-123',
              title: 'Implement voice API integration',
              changes: 3,
              assignee: 'John Doe'
            }
          ]
        }
      },
      {
        squad: { name: 'Core RCM' },
        jiraData: { issues: [] },
        slackData: { decisions: [], risks: [], launches: [] },
        teamSummary: {
          totalIssues: 0,
          issuesWithChanges: 0,
          newItems: 0,
          totalChanges: 0,
          activityLevel: 'No Activity',
          statusChanges: 0,
          assigneeChanges: 0,
          storyPointChanges: 0,
          priorityChanges: 0,
          comments: 0,
          mostActiveIssues: []
        }
      }
    ];
    
    console.log('📄 Generating formatted executive summary...');
    const executiveSummaryContent = await notionPublisher.generateAIEnhancedExecutiveSummary(
      sampleSquadData, 
      { startDate, endDate }, 
      generatedTime
    );
    
    console.log('📄 Generated Executive Summary Content:\n');
    console.log('='.repeat(80));
    console.log(executiveSummaryContent);
    console.log('='.repeat(80));
    
    console.log('\n📄 Generating formatted squad content...');
    const squadContent = await notionPublisher.generateAIEnhancedSquadContent(
      sampleSquadData[0], 
      { startDate, endDate }, 
      generatedTime
    );
    
    console.log('📄 Generated Squad Content:\n');
    console.log('='.repeat(80));
    console.log(squadContent);
    console.log('='.repeat(80));
    
    // Test the rich text parsing
    console.log('\n🔧 Testing rich text parsing...');
    const testText = 'This is **bold text** and this is *italic text* with **more bold** and *more italic*.';
    const richText = notionPublisher.parseRichText(testText);
    console.log('Original:', testText);
    console.log('Parsed:', JSON.stringify(richText, null, 2));
    
    // Save to files for review
    const fs = require('fs');
    fs.writeFileSync('formatted-executive-summary.md', executiveSummaryContent);
    fs.writeFileSync('formatted-squad-content.md', squadContent);
    
    console.log('\n💾 Content saved to:');
    console.log('  • formatted-executive-summary.md');
    console.log('  • formatted-squad-content.md');
    
  } catch (error) {
    console.error('❌ Error testing formatted Notion page:', error.message);
    console.error(error.stack);
  }
}

testFormattedNotionPage();
