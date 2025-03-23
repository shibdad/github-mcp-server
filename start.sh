#!/bin/bash

# GitHub MCP Server startup script
# This script starts the GitHub MCP server for Claude Desktop integration

# Change to script directory
cd "$(dirname "$0")"

# Make scripts executable
chmod +x index.js

# If a GitHub token is provided via environment variable, use it
# Otherwise, check for a token file
if [ -z "$GITHUB_TOKEN" ]; then
  if [ -f ".github_token" ]; then
    export GITHUB_TOKEN=$(cat .github_token)
    echo "Using GitHub token from .github_token file" >&2
  else
    echo "No GitHub token found. Some functionality will be limited." >&2
    echo "To use GitHub API features, create a .github_token file or set the GITHUB_TOKEN environment variable." >&2
  fi
fi

# Start the server using node
exec node index.js
