#!/usr/bin/env node

/**
 * GitHub MCP Server
 * GitHub integration for Claude Desktop using Model Context Protocol
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { execSync } = require('child_process');
const https = require('https');

// Get GitHub token from environment variable
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// If GitHub token is available, log that it's configured (to stderr, not stdout)
if (GITHUB_TOKEN) {
  console.error('GitHub token configured');
} else {
  console.error('No GitHub token provided. Some functionality may be limited.');
}

/**
 * Execute a git command and return its output
 */
function executeGitCommand(command) {
  try {
    // Execute command with authentication if token is available
    const output = execSync(command, { 
      encoding: 'utf8',
      env: {
        ...process.env,
        // Set GIT_ASKPASS to a non-existent command to prevent interactive password prompts
        GIT_ASKPASS: 'echo',
        // Disable credential helpers
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_NOGLOBAL: '1'
      }
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Make a request to the GitHub API
 */
async function githubApiRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      headers: {
        'User-Agent': 'GitHub-MCP-Server',
        'Accept': 'application/vnd.github.v3+json',
        ...(GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {})
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`GitHub API returned ${res.statusCode}: ${data}`));
          return;
        }
        
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (e) {
          reject(new Error(`Failed to parse GitHub API response: ${e.message}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`GitHub API request failed: ${err.message}`));
    });
  });
}

async function main() {
  // Create an MCP server
  const server = new McpServer({
    name: "GitHub Control",
    version: "1.0.0"
  });

  // Clone repository tool
  server.tool("git-clone", {
    url: z.string().describe("URL of the repository to clone"),
    directory: z.string().optional().describe("Directory to clone into (optional)")
  }, async ({ url, directory }) => {
    // Update URL with token if available for private repos
    let cloneUrl = url;
    if (GITHUB_TOKEN && url.includes('github.com')) {
      const urlObj = new URL(url);
      if (urlObj.protocol === 'https:') {
        // Insert token into URL
        urlObj.username = GITHUB_TOKEN;
        cloneUrl = urlObj.toString();
      }
    }

    const dir = directory || '';
    const command = `git clone ${cloneUrl} ${dir}`.trim();
    
    const result = executeGitCommand(command);
    
    if (result.success) {
      return {
        content: [{
          type: "text",
          text: `Successfully cloned repository from ${url}${directory ? ` to ${directory}` : ''}.`
        }]
      };
    } else {
      return {
        content: [{
          type: "text",
          text: `Failed to clone repository: ${result.error}`
        }]
      };
    }
  });

  // Check git status
  server.tool("git-status", {
    directory: z.string().optional().describe("Directory to check status for (optional)")
  }, async ({ directory }) => {
    const dir = directory || '.';
    const command = `cd ${dir} && git status`;
    
    const result = executeGitCommand(command);
    
    if (result.success) {
      return {
        content: [{
          type: "text",
          text: `Git status for ${directory || 'current directory'}:\n${result.output}`
        }]
      };
    } else {
      return {
        content: [{
          type: "text",
          text: `Failed to get git status: ${result.error}`
        }]
      };
    }
  });

  // List GitHub repositories
  server.tool("github-list-repos", {
    limit: z.number().optional().describe("Maximum number of repositories to return (optional)")
  }, async ({ limit = 10 }) => {
    if (!GITHUB_TOKEN) {
      return {
        content: [{
          type: "text",
          text: `GitHub token not configured. Please set the GITHUB_TOKEN environment variable to access repositories.`
        }]
      };
    }
    
    try {
      // Get user's repositories from GitHub API
      const repos = await githubApiRequest('/user/repos?sort=updated&per_page=' + limit);
      
      if (!repos || repos.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No repositories found."
          }]
        };
      }
      
      // Format repos for display
      const repoList = repos.map((repo, i) => 
        `${i + 1}. ${repo.name}: ${repo.description || 'No description'} (${repo.private ? 'Private' : 'Public'})`
      ).join('\n');
      
      return {
        content: [{
          type: "text",
          text: `GitHub repositories:\n${repoList}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to list repositories: ${error.message}`
        }]
      };
    }
  });

  // Get repository details
  server.tool("github-repo-info", {
    repo: z.string().describe("Repository name with owner (e.g., owner/repo)")
  }, async ({ repo }) => {
    try {
      // Get repository details from GitHub API
      const repoDetails = await githubApiRequest(`/repos/${repo}`);
      
      const details = [
        `Repository: ${repoDetails.full_name}`,
        `Description: ${repoDetails.description || 'No description'}`,
        `Stars: ${repoDetails.stargazers_count}`,
        `Forks: ${repoDetails.forks_count}`,
        `Watchers: ${repoDetails.watchers_count}`,
        `Open Issues: ${repoDetails.open_issues_count}`,
        `Created: ${new Date(repoDetails.created_at).toDateString()}`,
        `Last Updated: ${new Date(repoDetails.updated_at).toDateString()}`,
        `Language: ${repoDetails.language || 'Not specified'}`,
        `License: ${repoDetails.license ? repoDetails.license.name : 'Not specified'}`,
        `Visibility: ${repoDetails.private ? 'Private' : 'Public'}`,
        `URL: ${repoDetails.html_url}`
      ].join('\n');
      
      return {
        content: [{
          type: "text",
          text: details
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to get repository details: ${error.message}`
        }]
      };
    }
  });

  // Search GitHub repositories
  server.tool("github-search-repos", {
    query: z.string().describe("Search query"),
    limit: z.number().optional().describe("Maximum number of repositories to return (optional)")
  }, async ({ query, limit = 10 }) => {
    try {
      // Search repositories from GitHub API
      const searchResults = await githubApiRequest(`/search/repositories?q=${encodeURIComponent(query)}&per_page=${limit}`);
      
      if (!searchResults.items || searchResults.items.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No repositories found matching "${query}".`
          }]
        };
      }
      
      // Format repos for display
      const resultsList = searchResults.items.map((repo, i) => 
        `${i + 1}. ${repo.full_name}: ${repo.description || 'No description'} (⭐ ${repo.stargazers_count})`
      ).join('\n');
      
      return {
        content: [{
          type: "text",
          text: `GitHub repositories matching "${query}":\n${resultsList}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to search repositories: ${error.message}`
        }]
      };
    }
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('Error in MCP server:', err);
  process.exit(1);
});
