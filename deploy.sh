#!/bin/bash

# A quick helper script to deploy your changes to GitHub!
# Run this by typing: ./deploy.sh
# in your terminal whenever you want to update the live website.

echo "🚀 Deploying updates to GitHub..."

# Stage all new changes
git add .

# Commit with a generic message containing the date
git commit -m "Site update: $(date)"

# Push to the main branch
git push origin main

echo "✅ Done! Your website will automatically update in 1-2 minutes."
