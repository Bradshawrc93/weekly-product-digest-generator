const NotionPageGenerator = require('./src/generators/notionPageGenerator');
const { logger } = require('./src/utils/logger');

// Sample data based on the actual run
const sampleMetrics = {
  'Core RCM': { done: 5, updated: 15, created: 8, stale: 0, inProgress: 0, blocked: 0 },
  'Voice': { done: 2, updated: 11, created: 6, stale: 4, inProgress: 3, blocked: 1 },
  'Customer-Facing': { done: 0, updated: 15, created: 15, done: 0, inProgress: 2, stale: 0, blocked: 0 },
  'HITL': { done: 0, updated: 0, created: 0, inProgress: 0, stale: 0, blocked: 0 },
  'Team EPIC': { done: 0, updated: 1, created: 1, inProgress: 0, stale: 0, blocked: 0 },
  'Developer Efficiency': { done: 0, updated: 0, created: 0, inProgress: 0, stale: 0, blocked: 0 },
  'Data Collection': { done: 0, updated: 0, created: 0, inProgress: 0, stale: 0, blocked: 0 },
  'ThoughtHub Platform': { done: 0, updated: 0, created: 0, inProgress: 0, stale: 0, blocked: 0 },
  'Medical Coding': { done: 0, updated: 6, created: 5, inProgress: 1, stale: 0, blocked: 0 },
  'Deep Research': { done: 0, updated: 0, created: 0, inProgress: 0, stale: 0, blocked: 0 }
};

const sampleOrganizedData = {
  'Core RCM': {
    completedTickets: [
      { key: 'PO-123', summary: 'Sample completed ticket 1', assignee: 'John Doe' },
      { key: 'PO-124', summary: 'Sample completed ticket 2', assignee: 'Jane Smith' }
    ],
    changelogEvents: [],
    staleTickets: [],
    backlogTickets: [],
    blockedTickets: [],
    newTickets: []
  },
  'Voice': {
    completedTickets: [
      { key: 'PO-125', summary: 'Voice feature completed', assignee: 'Alice Johnson' }
    ],
    changelogEvents: [],
    staleTickets: [
      { key: 'PO-126', summary: 'Stale voice ticket', assignee: 'Bob Wilson', daysStale: 20 }
    ],
    backlogTickets: [],
    blockedTickets: [
      { key: 'PO-127', summary: 'Blocked voice ticket', assignee: 'Carol Brown', daysBlocked: 5 }
    ],
    newTickets: []
  },
  'Customer-Facing': {
    completedTickets: [],
    changelogEvents: [],
    staleTickets: [],
    backlogTickets: [],
    blockedTickets: [],
    newTickets: [
      { key: 'PO-128', summary: 'New customer feature', assignee: 'David Lee' }
    ]
  }
};

// Different AI summary approaches
function generateSummaryV1(metrics, organizedData) {
  // Current approach - more analytical
  const totalDone = Object.values(metrics).reduce((sum, squad) => sum + squad.done, 0);
  const totalStale = Object.values(metrics).reduce((sum, squad) => sum + squad.stale, 0);
  const totalBlocked = Object.values(metrics).reduce((sum, squad) => sum + squad.blocked, 0);
  const totalCreated = Object.values(metrics).reduce((sum, squad) => sum + squad.created, 0);
  const totalUpdated = Object.values(metrics).reduce((sum, squad) => sum + squad.updated, 0);

  let mostActiveSquad = null;
  let maxActivity = 0;

  Object.entries(metrics).forEach(([squadName, squadMetrics]) => {
    const activity = squadMetrics.done + squadMetrics.updated + squadMetrics.created;
    if (activity > maxActivity) {
      maxActivity = activity;
      mostActiveSquad = squadName;
    }
  });

  let summary = `Team activity was ${totalDone > 5 ? 'strong' : totalDone > 2 ? 'moderate' : 'minimal'} this week with ${totalDone} tickets completed across all squads. `;
  
  if (mostActiveSquad) {
    const squadMetrics = metrics[mostActiveSquad];
    summary += `${mostActiveSquad} squad led productivity with ${squadMetrics.done} completion${squadMetrics.done !== 1 ? 's' : ''} and ${squadMetrics.updated} update${squadMetrics.updated !== 1 ? 's' : ''}. `;
  }

  if (totalStale > 0) {
    summary += `The concerning trend is ${totalStale} stale tickets across multiple squads. `;
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
}

function generateSummaryV2(metrics, organizedData) {
  // Executive summary approach - high-level insights
  const totalDone = Object.values(metrics).reduce((sum, squad) => sum + squad.done, 0);
  const totalCreated = Object.values(metrics).reduce((sum, squad) => sum + squad.created, 0);
  const totalStale = Object.values(metrics).reduce((sum, squad) => sum + squad.stale, 0);
  const totalBlocked = Object.values(metrics).reduce((sum, squad) => sum + squad.blocked, 0);

  const activeSquads = Object.entries(metrics).filter(([_, squad]) => 
    squad.done > 0 || squad.created > 0 || squad.updated > 0
  );

  let summary = `📊 **Weekly Overview**: ${totalDone} deliverables completed, ${totalCreated} new initiatives started. `;
  
  if (activeSquads.length > 0) {
    const topSquads = activeSquads
      .sort(([_, a], [__, b]) => (b.done + b.created) - (a.done + a.created))
      .slice(0, 2)
      .map(([name, _]) => name);
    
    summary += `**${topSquads.join(' & ')}** led this week's progress. `;
  }

  if (totalStale > 0 || totalBlocked > 0) {
    summary += `⚠️ **Attention needed**: ${totalStale} items require review, ${totalBlocked} are blocked. `;
  } else {
    summary += `✅ **Clean slate**: No blocked items and minimal stale tickets. `;
  }

  const completionRate = totalDone / (totalDone + totalCreated) * 100;
  if (completionRate > 50) {
    summary += `🎯 **Strong execution**: ${completionRate.toFixed(0)}% completion rate shows good delivery focus.`;
  } else {
    summary += `📈 **Growth focus**: High new initiative creation indicates strong product development momentum.`;
  }

  return summary;
}

function generateSummaryV3(metrics, organizedData) {
  // Story-driven approach - narrative focus
  const totalDone = Object.values(metrics).reduce((sum, squad) => sum + squad.done, 0);
  const totalCreated = Object.values(metrics).reduce((sum, squad) => sum + squad.created, 0);
  const totalStale = Object.values(metrics).reduce((sum, squad) => sum + squad.stale, 0);
  const totalBlocked = Object.values(metrics).reduce((sum, squad) => sum + squad.blocked, 0);

  const squadsWithActivity = Object.entries(metrics).filter(([_, squad]) => 
    squad.done > 0 || squad.created > 0
  );

  let summary = `🚀 **This Week's Story**: `;
  
  if (totalDone > 0) {
    summary += `We shipped ${totalDone} key deliverables`;
    if (totalCreated > 0) {
      summary += ` while launching ${totalCreated} new initiatives`;
    }
    summary += `. `;
  } else if (totalCreated > 0) {
    summary += `We kicked off ${totalCreated} new initiatives, setting the stage for next week's deliveries. `;
  } else {
    summary += `Focus was on refinement and planning this week. `;
  }

  if (squadsWithActivity.length > 0) {
    const heroSquad = squadsWithActivity[0];
    summary += `**${heroSquad[0]}** emerged as this week's MVP with the most impactful contributions. `;
  }

  if (totalStale > 0 || totalBlocked > 0) {
    summary += `🔧 **What's Next**: We need to address ${totalStale} items that have been waiting and unblock ${totalBlocked} critical path items. `;
  } else {
    summary += `✨ **Clean Operations**: All systems are running smoothly with no bottlenecks. `;
  }

  if (totalDone >= totalCreated) {
    summary += `🎯 **Bottom Line**: We're delivering faster than we're creating new work - excellent execution rhythm.`;
  } else {
    summary += `📈 **Bottom Line**: We're building a strong pipeline for future deliveries.`;
  }

  return summary;
}

function generateSummaryV4(metrics, organizedData) {
  // Data-driven approach - metrics focus
  const totalDone = Object.values(metrics).reduce((sum, squad) => sum + squad.done, 0);
  const totalCreated = Object.values(metrics).reduce((sum, squad) => sum + squad.created, 0);
  const totalUpdated = Object.values(metrics).reduce((sum, squad) => sum + squad.updated, 0);
  const totalStale = Object.values(metrics).reduce((sum, squad) => sum + squad.stale, 0);
  const totalBlocked = Object.values(metrics).reduce((sum, squad) => sum + squad.blocked, 0);
  const totalInProgress = Object.values(metrics).reduce((sum, squad) => sum + squad.inProgress, 0);

  const activeSquads = Object.entries(metrics).filter(([_, squad]) => 
    squad.done > 0 || squad.created > 0 || squad.updated > 0
  ).length;

  let summary = `📈 **Key Metrics**: ${totalDone} completed | ${totalCreated} created | ${totalUpdated} updated | ${totalInProgress} in progress. `;
  
  summary += `${activeSquads} of ${Object.keys(metrics).length} squads were active this week. `;

  if (totalDone > 0) {
    const avgPerSquad = (totalDone / activeSquads).toFixed(1);
    summary += `Average completion rate: ${avgPerSquad} tickets per active squad. `;
  }

  if (totalStale > 0) {
    summary += `⚠️ **Risk**: ${totalStale} tickets are stale (${((totalStale / (totalDone + totalCreated + totalStale)) * 100).toFixed(0)}% of total activity). `;
  }

  if (totalBlocked > 0) {
    summary += `🚫 **Blockers**: ${totalBlocked} tickets are blocked and need immediate attention. `;
  }

  const velocity = totalDone + totalCreated;
  if (velocity > 10) {
    summary += `⚡ **High Velocity**: Team is moving fast with ${velocity} total tickets processed.`;
  } else if (velocity > 5) {
    summary += `📊 **Steady Pace**: Moderate velocity with ${velocity} tickets processed.`;
  } else {
    summary += `🎯 **Focused Work**: Lower volume but likely higher quality deliverables.`;
  }

  return summary;
}

function generateSummaryV5(metrics, organizedData) {
  // Action-oriented approach - next steps focus
  const totalDone = Object.values(metrics).reduce((sum, squad) => sum + squad.done, 0);
  const totalCreated = Object.values(metrics).reduce((sum, squad) => sum + squad.created, 0);
  const totalStale = Object.values(metrics).reduce((sum, squad) => sum + squad.stale, 0);
  const totalBlocked = Object.values(metrics).reduce((sum, squad) => sum + squad.blocked, 0);

  const squadsWithStale = Object.entries(metrics).filter(([_, squad]) => squad.stale > 0);
  const squadsWithBlocked = Object.entries(metrics).filter(([_, squad]) => squad.blocked > 0);

  let summary = `🎯 **This Week's Impact**: ${totalDone} deliverables shipped, ${totalCreated} new initiatives launched. `;

  if (totalDone > totalCreated) {
    summary += `**Delivery focus** - we completed more than we started, great execution! `;
  } else if (totalCreated > totalDone) {
    summary += `**Growth focus** - building pipeline for future deliveries. `;
  } else {
    summary += `**Balanced approach** - steady delivery and growth. `;
  }

  if (totalStale > 0 || totalBlocked > 0) {
    summary += `🔧 **Immediate Actions Needed**: `;
    
    if (totalBlocked > 0) {
      const blockedSquads = squadsWithBlocked.map(([name, _]) => name).join(', ');
      summary += `Unblock ${totalBlocked} items (${blockedSquads}). `;
    }
    
    if (totalStale > 0) {
      const staleSquads = squadsWithStale.map(([name, _]) => name).join(', ');
      summary += `Review ${totalStale} stale items (${staleSquads}). `;
    }
  } else {
    summary += `✅ **Clean Operations**: No immediate blockers or stale items. `;
  }

  const topPerformer = Object.entries(metrics)
    .filter(([_, squad]) => squad.done > 0)
    .sort(([_, a], [__, b]) => b.done - a.done)[0];

  if (topPerformer) {
    summary += `🏆 **Shoutout**: ${topPerformer[0]} delivered ${topPerformer[1].done} completions this week!`;
  } else {
    summary += `📋 **Next Week**: Focus on completing in-progress items and launching new initiatives.`;
  }

  return summary;
}

// Test all approaches
console.log('🤖 AI TL;DR Summary Test Results\n');
console.log('=' .repeat(80));

const approaches = [
  { name: 'V1 - Current Analytical', fn: generateSummaryV1 },
  { name: 'V2 - Executive Summary', fn: generateSummaryV2 },
  { name: 'V3 - Story-Driven', fn: generateSummaryV3 },
  { name: 'V4 - Data-Driven', fn: generateSummaryV4 },
  { name: 'V5 - Action-Oriented', fn: generateSummaryV5 }
];

approaches.forEach((approach, index) => {
  console.log(`\n${index + 1}. ${approach.name}`);
  console.log('-'.repeat(40));
  console.log(approach.fn(sampleMetrics, sampleOrganizedData));
  console.log();
});

console.log('=' .repeat(80));
console.log('💡 Choose your preferred style and we can update the generator!');
