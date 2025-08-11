const { logger } = require('../utils/logger');
const axios = require('axios');
const moment = require('moment');

class BitbucketIngestor {
  constructor() {
    this.username = process.env.BITBUCKET_USERNAME;
    this.appPassword = process.env.BITBUCKET_APP_PASSWORD;
    this.workspace = process.env.BITBUCKET_WORKSPACE;
    this.baseUrl = 'https://api.bitbucket.org/2.0';
  }

  async collectData(squad, dateRange) {
    logger.logSquad('info', 'Collecting Bitbucket data', squad.name, { 
      startDate: dateRange.startDate.format(), 
      endDate: dateRange.endDate.format() 
    });
    
    try {
      const prs = await this.fetchPullRequests(squad, dateRange);
      const commits = await this.fetchCommits(squad, dateRange);
      
      // Process and enrich data
      const processedPRs = await this.processPullRequests(prs, squad);
      const processedCommits = await this.processCommits(commits, squad);
      
      return {
        prs: processedPRs,
        commits: processedCommits,
        summary: {
          totalPRs: processedPRs.length,
          totalCommits: processedCommits.length,
          prsByStatus: this.groupByStatus(processedPRs),
          prsByAuthor: this.groupByAuthor(processedPRs),
          mergedPRs: processedPRs.filter(pr => pr.state === 'MERGED').length
        }
      };
    } catch (error) {
      logger.logSquad('error', 'Failed to collect Bitbucket data', squad.name, { error: error.message });
      throw error;
    }
  }

  async fetchPullRequests(squad, dateRange) {
    logger.logSquad('debug', 'Fetching Bitbucket pull requests', squad.name, { 
      repos: squad.bitbucketRepos,
      dateRange: `${dateRange.startDate.format()} to ${dateRange.endDate.format()}`
    });

    const allPRs = [];
    
    for (const repo of squad.bitbucketRepos) {
      try {
        const repoPRs = await this.fetchRepoPullRequests(repo, dateRange);
        allPRs.push(...repoPRs);
        
        logger.logSquad('debug', 'Fetched PRs for repo', squad.name, { 
          repo, 
          prCount: repoPRs.length 
        });
      } catch (error) {
        logger.logSquad('warn', 'Failed to fetch PRs for repo', squad.name, { 
          repo, 
          error: error.message 
        });
      }
    }

    logger.logSquad('info', 'Bitbucket PRs fetched successfully', squad.name, { 
      totalPRs: allPRs.length 
    });

    return allPRs;
  }

  async fetchRepoPullRequests(repo, dateRange) {
    const allPRs = [];
    let page = 1;
    const pageSize = 50;
    
    try {
      while (true) {
        const response = await axios.get(`${this.baseUrl}/repositories/${this.workspace}/${repo}/pullrequests`, {
          auth: {
            username: this.username,
            password: this.appPassword
          },
          params: {
            state: 'ALL',
            page: page,
            pagelen: pageSize,
            sort: '-updated_on'
          }
        });

        const prs = response.data.values || [];
        
        // Filter PRs by date range
        const filteredPRs = prs.filter(pr => {
          const updatedDate = moment(pr.updated_on);
          return updatedDate.isBetween(dateRange.startDate, dateRange.endDate, 'day', '[]');
        });

        allPRs.push(...filteredPRs);
        
        // Check if there are more pages
        if (!response.data.next || filteredPRs.length < prs.length) {
          break;
        }
        
        page++;
      }

      return allPRs;
    } catch (error) {
      logger.logSquad('error', 'Failed to fetch repo PRs', squad.name, { 
        repo, 
        error: error.message 
      });
      throw error;
    }
  }

  async fetchCommits(squad, dateRange) {
    logger.logSquad('debug', 'Fetching Bitbucket commits', squad.name);
    
    const allCommits = [];
    
    for (const repo of squad.bitbucketRepos) {
      try {
        const repoCommits = await this.fetchRepoCommits(repo, dateRange);
        allCommits.push(...repoCommits);
        
        logger.logSquad('debug', 'Fetched commits for repo', squad.name, { 
          repo, 
          commitCount: repoCommits.length 
        });
      } catch (error) {
        logger.logSquad('warn', 'Failed to fetch commits for repo', squad.name, { 
          repo, 
          error: error.message 
        });
      }
    }

    logger.logSquad('info', 'Bitbucket commits fetched successfully', squad.name, { 
      totalCommits: allCommits.length 
    });

    return allCommits;
  }

  async fetchRepoCommits(repo, dateRange) {
    const allCommits = [];
    let page = 1;
    const pageSize = 50;
    
    try {
      while (true) {
        const response = await axios.get(`${this.baseUrl}/repositories/${this.workspace}/${repo}/commits`, {
          auth: {
            username: this.username,
            password: this.appPassword
          },
          params: {
            page: page,
            pagelen: pageSize,
            sort: '-date'
          }
        });

        const commits = response.data.values || [];
        
        // Filter commits by date range
        const filteredCommits = commits.filter(commit => {
          const commitDate = moment(commit.date);
          return commitDate.isBetween(dateRange.startDate, dateRange.endDate, 'day', '[]');
        });

        allCommits.push(...filteredCommits);
        
        // Check if there are more pages
        if (!response.data.next || filteredCommits.length < commits.length) {
          break;
        }
        
        page++;
      }

      return allCommits;
    } catch (error) {
      logger.logSquad('error', 'Failed to fetch repo commits', squad.name, { 
        repo, 
        error: error.message 
      });
      throw error;
    }
  }

  async processPullRequests(prs, squad) {
    return prs.map(pr => {
      const linkedIssues = this.extractLinkedIssues(pr);
      const labels = pr.labels?.map(label => label.name) || [];
      
      return {
        number: pr.id,
        title: pr.title,
        author: pr.author?.username,
        mergedAt: pr.merged_on,
        createdAt: pr.created_on,
        updatedAt: pr.updated_on,
        state: pr.state,
        merged: pr.state === 'MERGED',
        linkedIssues: linkedIssues,
        labels: labels,
        repository: pr.source.repository.name,
        branchName: pr.source.branch.name,
        baseBranch: pr.destination.branch.name,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        changedFiles: pr.changed_files || 0,
        reviewCount: pr.reviewers?.length || 0,
        body: pr.description,
        url: pr.links.html.href,
        apiUrl: pr.links.self.href
      };
    });
  }

  async processCommits(commits, squad) {
    return commits.map(commit => {
      const linkedIssues = this.extractLinkedIssuesFromCommit(commit);
      
      return {
        sha: commit.hash,
        message: commit.message,
        author: commit.author?.user?.username || commit.author?.raw,
        committer: commit.author?.user?.username || commit.author?.raw,
        date: commit.date,
        linkedIssues: linkedIssues,
        repository: commit.repository?.name || 'unknown',
        url: commit.links.html.href,
        additions: 0, // Would need additional API call
        deletions: 0, // Would need additional API call
        changedFiles: 0 // Would need additional API call
      };
    });
  }

  extractLinkedIssues(pr) {
    const linkedIssues = [];
    
    // Extract from PR title
    const titleMatches = pr.title.match(/(?:PLAT|MOB|DATA|PROJ)-\d+/gi) || [];
    linkedIssues.push(...titleMatches);
    
    // Extract from PR description
    const bodyMatches = pr.description?.match(/(?:PLAT|MOB|DATA|PROJ)-\d+/gi) || [];
    linkedIssues.push(...bodyMatches);
    
    // Extract from branch name
    const branchMatches = pr.source.branch.name.match(/(?:PLAT|MOB|DATA|PROJ)-\d+/gi) || [];
    linkedIssues.push(...branchMatches);
    
    // Remove duplicates and return
    return [...new Set(linkedIssues)];
  }

  extractLinkedIssuesFromCommit(commit) {
    const linkedIssues = [];
    
    // Extract from commit message
    const messageMatches = commit.message.match(/(?:PLAT|MOB|DATA|PROJ)-\d+/gi) || [];
    linkedIssues.push(...messageMatches);
    
    // Remove duplicates and return
    return [...new Set(linkedIssues)];
  }

  groupByStatus(prs) {
    return prs.reduce((acc, pr) => {
      const status = pr.state || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }

  groupByAuthor(prs) {
    return prs.reduce((acc, pr) => {
      const author = pr.author || 'Unknown';
      acc[author] = (acc[author] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = { BitbucketIngestor };
