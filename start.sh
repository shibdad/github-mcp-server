#!/bin/bash

# GitHub MCP Server startup script
# This script starts the GitHub MCP server for Claude Desktop integration

# Change to script directory
cd "$(dirname "$0")"

# Make scripts executable
chmod +x index.js

# Check for token in file first
if [ -f ".github_token" ]; then
  export GITHUB_TOKEN=$(cat .github_token)
  echo "Using GitHub token from .github_token file" >&2
elif [ -f "$HOME/.github_token" ]; then
  export GITHUB_TOKEN=$(cat "$HOME/.github_token")
  echo "Using GitHub token from ~/.github_token file" >&2
else
  echo "No GitHub token file found. Some functionality will be limited." >&2
  echo "To use GitHub API features, create a .github_token file in this directory." >&2
fi

# Verify the token is available
if [ -n "$GITHUB_TOKEN" ]; then
  echo "GitHub token is set" >&2
else 
  echo "GitHub token is NOT set" >&2
fi

# Start the server with node, ensuring proper error reporting
node index.js
