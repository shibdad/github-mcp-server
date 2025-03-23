# GitHub MCP Server

A GitHub integration for Claude Desktop using the Model Context Protocol (MCP).

## Features

- `git-clone`: Clone a Git repository
- `git-status`: Check the status of a Git repository
- `github-list-repos`: List repositories (requires GitHub token)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/github-mcp-server.git
   cd github-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Make the scripts executable:
   ```bash
   chmod +x start.sh index.js
   ```

4. Configure your GitHub token (optional, but recommended):
   ```bash
   echo "your-github-token" > .github_token
   ```

   Alternatively, you can set the `GITHUB_TOKEN` environment variable.

5. Configure Claude Desktop:

   Open Claude Desktop's configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

   Add the GitHub MCP server configuration:
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "/bin/sh",
         "args": ["-c", "/path/to/github-mcp-server/start.sh"]
       }
     }
   }
   ```

   Replace `/path/to/github-mcp-server` with the actual path to where you cloned the repository.

6. Restart Claude Desktop

## Usage

1. In Claude Desktop, click on the hammer icon to see available tools
2. Ask Claude to use the GitHub tools:
   - "Clone the repository at https://github.com/example/repo"
   - "Check the git status of my current directory"
   - "List my GitHub repositories"

## Requirements

- Node.js 16+
- Git command-line tools
- Claude Desktop

## Configuration

### GitHub Token

To access private repositories and use GitHub API features, you'll need a GitHub Personal Access Token. You can provide it in one of these ways:

1. Create a `.github_token` file in the project directory with your token
2. Set the `GITHUB_TOKEN` environment variable
3. Modify the Claude Desktop configuration to include the token:
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "/bin/sh",
         "args": ["-c", "/path/to/github-mcp-server/start.sh"],
         "env": {
           "GITHUB_TOKEN": "your-github-token"
         }
       }
     }
   }
   ```

## License

MIT
