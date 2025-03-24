# 🔗 GitHub MCP Server for Claude Desktop

> Supercharge your Claude Desktop with seamless GitHub integration!

This MCP server connects Claude Desktop directly to your GitHub repos and git commands, letting you interact with your code and repositories through natural conversation.

## ✨ Features

- 🔄 `git-clone` - Clone any repository with a simple request
- 📊 `git-status` - Check what's happening in your git repos
- 📋 `github-list-repos` - Browse your GitHub repositories
- 🔍 `github-repo-info` - Get detailed information about any repository
- 📝 `git-commit` - Commit changes to your repositories
- 🚀 `git-push` - Push your commits to GitHub
- 🆕 `github-create-repo` - Create new GitHub repositories

## 🚀 Quick Start

1. Clone this repo:
   ```bash
   git clone https://github.com/shibdad/github-mcp-server.git
   cd github-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Make it executable:
   ```bash
   chmod +x start.sh index.js
   ```

4. Add your GitHub token (for private repos and API access):
   ```bash
   echo "your-github-token" > .github_token
   ```

5. Hook it up to Claude Desktop:

   Edit Claude's config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

   Add this to your config:
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

6. Restart Claude and you're good to go!

## 💬 Try These Prompts

Once connected, ask Claude things like:
- "Clone the tensorflow/models repository to my downloads folder"
- "What's the git status of my project directory?"
- "Show me a list of my GitHub repositories"
- "Get details about the microsoft/vscode repository"
- "Commit my changes with the message 'Update documentation'"
- "Push my commits to GitHub"
- "Create a new repository called 'my-awesome-project'"

## 🔧 Requirements

- Node.js 16+
- Git command-line tools
- Claude Desktop
- GitHub Personal Access Token (for API access)

## 🔒 GitHub Token Options

Need to access private repos? Add your token any of these ways:

1. Create a `.github_token` file in the project folder
2. Set the `GITHUB_TOKEN` environment variable
3. Add it directly in Claude's config:
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

## 🙋‍♂️ Contributing

Found a bug? Want to add a feature? PRs welcome!

## 📜 License

MIT
