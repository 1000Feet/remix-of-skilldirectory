#!/bin/bash

# Print Node.js and npm versions
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Clean install dependencies
npm ci

# Build the project
npm run build
