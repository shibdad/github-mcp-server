#!/usr/bin/env node

/**
 * GitHub MCP Server
 * GitHub integration for Claude Desktop using Model Context Protocol
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { execSync } = require('child_process');

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
  }, async ({ limit = 5 }) => {
    if (!GITHUB_TOKEN) {
      return {
        content: [{
          type: "text",
          text: `GitHub token not configured. Please set the GITHUB_TOKEN environment variable to access repositories.`
        }]
      };
    }
    
    try {
      // If we had a real implementation, we would use the GitHub API here
      // This is a placeholder for demonstration
      const repos = [
        "example-repo-1: Example repository 1",
        "example-repo-2: Example repository 2",
        "example-repo-3: Example repository 3",
        "example-repo-4: Example repository 4",
        "example-repo-5: Example repository 5"
      ].slice(0, limit);
      
      return {
        content: [{
          type: "text",
          text: `GitHub repositories:\n${repos.map((repo, i) => `${i + 1}. ${repo}`).join('\n')}`
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

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('Error in MCP server:', err);
  process.exit(1);
});
