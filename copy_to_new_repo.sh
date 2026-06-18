#!/bin/bash

# Script to copy all files to a new repository
# Usage: ./copy_to_new_repo.sh <destination_repo_path>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <destination_repo_path>"
    echo "Example: $0 /path/to/new/repository"
    echo "         $0 ../my_new_repo"
    exit 1
fi

DEST_REPO="$1"
SOURCE_DIR="$(dirname "$0")"

echo "🚀 Copying Bahrian Novotny My Universe to new repository..."
echo "Source: $SOURCE_DIR"
echo "Destination: $DEST_REPO"

# Check if destination exists
if [ -d "$DEST_REPO" ]; then
    read -p "Destination directory exists. Continue? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
else
    echo "Creating destination directory: $DEST_REPO"
    mkdir -p "$DEST_REPO"
fi

# Copy all files except .git directory
echo "📁 Copying files..."
rsync -av \
    --exclude='.git' \
    --exclude='copy_to_new_repo.sh' \
    --exclude='file_manifest.txt' \
    --exclude='README_COPY_INSTRUCTIONS.md' \
    "$SOURCE_DIR/" "$DEST_REPO/"

echo "✅ Files copied successfully!"
echo ""
echo "📋 Next steps:"
echo "1. cd $DEST_REPO"
echo "2. git init"
echo "3. git add ."
echo "4. git commit -m 'Initial commit: Bahrian Novotny My Universe'"
echo "5. git remote add origin <your-new-repo-url>"
echo "6. git branch -M main"
echo "7. git push -u origin main"
echo ""
echo "🌟 Your universe is ready to be deployed!"