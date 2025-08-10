const { logger } = require('../utils/logger');
const axios = require('axios');
const moment = require('moment');

class GitHubIngestor {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.org = process.env.GITHUB_ORG;
    this.baseUrl = 'https://api.github.com';
  }

  async collectData(squad, dateRange) {
    logger.logSquad('info', 'Collecting GitHub data', squad.name, { 
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
          mergedPRs: processedPRs.filter(pr => pr.state === 'closed' && pr.mergedAt).length
        }
      };
    } catch (error) {
      logger.logSquad('error', 'Failed to collect GitHub data', squad.name, { error: error.message });
      throw error;
    }
  }

  async fetchPullRequests(squad, dateRange) {
    logger.logSquad('debug', 'Fetching GitHub pull requests', squad.name, { 
      repos: squad.githubRepos,
      dateRange: `${dateRange.startDate.format()} to ${dateRange.endDate.format()}`
    });

    const allPRs = [];
    
    for (const repo of squad.githubRepos) {
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

    logger.logSquad('info', 'GitHub PRs fetched successfully', squad.name, { 
      totalPRs: allPRs.length 
    });

    return allPRs;
  }

  async fetchRepoPullRequests(repo, dateRange) {
    const query = `repo:${this.org}/${repo} is:pr updated:${dateRange.startDate.format('YYYY-MM-DD')}..${dateRange.endDate.format('YYYY-MM-DD')}`;
    
    try {
      const response = await axios.get(`${this.baseUrl}/search/issues`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        params: {
          q: query,
          sort: 'updated',
          order: 'desc',
          per_page: 100
        }
      });

      // Fetch detailed PR data for each issue
      const detailedPRs = await Promise.all(
        response.data.items.map(async (issue) => {
          try {
            const prResponse = await axios.get(`${this.baseUrl}/repos/${this.org}/${repo}/pulls/${issue.number}`, {
              headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            });
            return prResponse.data;
          } catch (error) {
            logger.logSquad('warn', 'Failed to fetch detailed PR data', squad.name, { 
              repo, 
              prNumber: issue.number, 
              error: error.message 
            });
            return null;
          }
        })
      );

      return detailedPRs.filter(pr => pr !== null);
    } catch (error) {
      logger.logSquad('error', 'Failed to fetch repo PRs', squad.name, { 
        repo, 
        error: error.message,
        query: query
      });
      throw error;
    }
  }

  async fetchCommits(squad, dateRange) {
    logger.logSquad('debug', 'Fetching GitHub commits', squad.name);
    
    const allCommits = [];
    
    for (const repo of squad.githubRepos) {
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

    logger.logSquad('info', 'GitHub commits fetched successfully', squad.name, { 
      totalCommits: allCommits.length 
    });

    return allCommits;
  }

  async fetchRepoCommits(repo, dateRange) {
    try {
      const response = await axios.get(`${this.baseUrl}/repos/${this.org}/${repo}/commits`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        params: {
          since: dateRange.startDate.toISOString(),
          until: dateRange.endDate.toISOString(),
          per_page: 100
        }
      });

      return response.data;
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
        number: pr.number,
        title: pr.title,
        author: pr.user?.login,
        mergedAt: pr.merged_at,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        state: pr.state,
        merged: pr.merged,
        linkedIssues: linkedIssues,
        labels: labels,
        repository: pr.base.repo.name,
        branchName: pr.head.ref,
        baseBranch: pr.base.ref,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        reviewCount: pr.requested_reviewers?.length || 0,
        body: pr.body,
        url: pr.html_url,
        apiUrl: pr.url
      };
    });
  }

  async processCommits(commits, squad) {
    return commits.map(commit => {
      const linkedIssues = this.extractLinkedIssuesFromCommit(commit);
      
      return {
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.author?.login || commit.commit.author.name,
        committer: commit.committer?.login || commit.commit.committer.name,
        date: commit.commit.author.date,
        linkedIssues: linkedIssues,
        repository: commit.url.split('/repos/')[1].split('/commits/')[0].split('/').pop(),
        url: commit.html_url,
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
    
    // Extract from PR body
    const bodyMatches = pr.body?.match(/(?:PLAT|MOB|DATA|PROJ)-\d+/gi) || [];
    linkedIssues.push(...bodyMatches);
    
    // Extract from branch name
    const branchMatches = pr.head.ref.match(/(?:PLAT|MOB|DATA|PROJ)-\d+/gi) || [];
    linkedIssues.push(...branchMatches);
    
    // Remove duplicates and return
    return [...new Set(linkedIssues)];
  }

  extractLinkedIssuesFromCommit(commit) {
    const linkedIssues = [];
    
    // Extract from commit message
    const messageMatches = commit.commit.message.match(/(?:PLAT|MOB|DATA|PROJ)-\d+/gi) || [];
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

module.exports = { GitHubIngestor };
