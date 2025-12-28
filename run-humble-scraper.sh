#!/bin/bash

# Humble Bundle Scraper Runner
# This script loads credentials from .env.humble and runs the scraper

# Check if .env.humble exists
if [ ! -f ".env.humble" ]; then
    echo "❌ Error: .env.humble file not found"
    echo ""
    echo "Please create .env.humble with your credentials:"
    echo "  HUMBLE_EMAIL=your_email@example.com"
    echo "  HUMBLE_PASSWORD=your_password"
    echo "  NOTION_TOKEN=your_notion_token"
    exit 1
fi

# Load environment variables from .env.humble
export $(cat .env.humble | grep -v '^#' | xargs)

# Check if credentials are set
if [ -z "$HUMBLE_EMAIL" ] || [ -z "$HUMBLE_PASSWORD" ]; then
    echo "❌ Error: HUMBLE_EMAIL and HUMBLE_PASSWORD must be set in .env.humble"
    exit 1
fi

# Run the scraper
echo "🚀 Starting Humble Bundle scraper..."
echo ""
node scrape-humble-bundle.js
