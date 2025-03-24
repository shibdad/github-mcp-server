#!/usr/bin/env node

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { execSync } = require('child_process');
const https = require('https');

// Get GitHub token from environment variable
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// Log token status to stderr for debugging
console.error(`GitHub token ${GITHUB_TOKEN ? 'is configured' : 'is NOT configured'}`);

/**
 * Execute a git command and return its output
 */
function executeGitCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Make a request to the GitHub API
 */
function githubApiRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    console.error(`Making GitHub API request to: ${endpoint}`);
    
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: method,
      headers: {
        'User-Agent': 'GitHub-MCP-Server',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    // Add token if available
    if (GITHUB_TOKEN) {
      options.headers['Authorization'] = `token ${GITHUB_TOKEN}`;
      console.error('Using GitHub token for authentication');
    }
    
    // Add content headers if sending data
    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.error(`API response status: ${res.statusCode}`);
        
        if (res.statusCode >= 400) {
          console.error(`API error: ${responseData}`);
          reject(new Error(`GitHub API returned ${res.statusCode}: ${responseData}`));
          return;
        }
        
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve(parsedData);
        } catch (e) {
          console.error(`Error parsing response: ${e.message}`);
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`API request error: ${error.message}`);
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
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
    const dir = directory || '';
    const command = `git clone ${url} ${dir}`.trim();
    
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

  // Commit changes
  server.tool("git-commit", {
    message: z.string().describe("Commit message"),
    directory: z.string().optional().describe("Directory to commit in (optional)"),
    add_all: z.boolean().optional().describe("Add all changes before committing (optional)")
  }, async ({ message, directory, add_all = true }) => {
    const dir = directory || '.';
    
    let commands = [];
    
    // Change to the specified directory
    commands.push(`cd ${dir}`);
    
    // Add changes if requested
    if (add_all) {
      commands.push('git add .');
    }
    
    // Commit with message
    commands.push(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    
    const command = commands.join(' && ');
    const result = executeGitCommand(command);
    
    if (result.success) {
      return {
        content: [{
          type: "text",
          text: `Successfully committed changes:\n${result.output}`
        }]
      };
    } else {
      return {
        content: [{
          type: "text",
          text: `Failed to commit changes: ${result.error}`
        }]
      };
    }
  });

  // Push changes
  server.tool("git-push", {
    directory: z.string().optional().describe("Directory to push from (optional)"),
    remote: z.string().optional().describe("Remote to push to (optional)"),
    branch: z.string().optional().describe("Branch to push (optional)")
  }, async ({ directory, remote = 'origin', branch = 'main' }) => {
    const dir = directory || '.';
    const command = `cd ${dir} && git push ${remote} ${branch}`;
    
    const result = executeGitCommand(command);
    
    if (result.success) {
      return {
        content: [{
          type: "text",
          text: `Successfully pushed changes to ${remote}/${branch}:\n${result.output}`
        }]
      };
    } else {
      return {
        content: [{
          type: "text",
          text: `Failed to push changes: ${result.error}`
        }]
      };
    }
  });

  // Create GitHub repository
  server.tool("github-create-repo", {
    name: z.string().describe("Repository name"),
    description: z.string().optional().describe("Repository description (optional)"),
    private: z.boolean().optional().describe("Make repository private (optional)"),
    auto_init: z.boolean().optional().describe("Auto-initialize with README (optional)")
  }, async ({ name, description = '', private = false, auto_init = true }) => {
    try {
      if (!GITHUB_TOKEN) {
        return {
          content: [{
            type: "text",
            text: `GitHub token not configured. Please set the GITHUB_TOKEN environment variable.`
          }]
        };
      }
      
      // Create repository using GitHub API
      const payload = {
        name: name,
        description: description,
        private: private,
        auto_init: auto_init
      };
      
      const repo = await githubApiRequest('/user/repos', 'POST', payload);
      
      return {
        content: [{
          type: "text",
          text: `Successfully created repository "${repo.name}".\nURL: ${repo.html_url}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to create repository: ${error.message}`
        }]
      };
    }
  });

  // List GitHub repositories
  server.tool("github-list-repos", {
    limit: z.number().optional().describe("Maximum number of repositories to return (optional)")
  }, async ({ limit = 10 }) => {
    console.error(`github-list-repos tool called with limit=${limit}`);
    
    try {
      // Check if token is available
      if (!GITHUB_TOKEN) {
        console.error('No GitHub token available');
        return {
          content: [{
            type: "text",
            text: `GitHub token not configured. Please set the GITHUB_TOKEN environment variable to access repositories.`
          }]
        };
      }
      
      // Make API request
      console.error('Making API request to list repos');
      const repos = await githubApiRequest('/user/repos?sort=updated&per_page=' + limit);
      console.error(`Received ${repos?.length || 0} repositories from API`);
      
      if (!repos || repos.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No repositories found for your account."
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
      console.error(`Error in github-list-repos: ${error.message}`);
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
      if (!GITHUB_TOKEN) {
        return {
          content: [{
            type: "text",
            text: `GitHub token not configured. Please set the GITHUB_TOKEN environment variable.`
          }]
        };
      }
      
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

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('Error in MCP server:', err);
  process.exit(1);
});
