#!/bin/bash

# Setup pre-commit hooks for the project
# Run once: ./scripts/setup-hooks.sh

set -e

echo "🔧 Setting up pre-commit hooks..."

# Check if pre-commit is installed
if ! command -v pre-commit &> /dev/null; then
    echo "❌ pre-commit not found. Install it with:"
    echo "   macOS/Homebrew: brew install pre-commit"
    echo "   Python/pip:     pip install pre-commit"
    exit 1
fi

# Install pre-commit hooks from config
pre-commit install
pre-commit install --hook-type pre-push

echo ""
echo "✅ Pre-commit hooks installed!"
echo ""
echo "Hooks will run on:"
echo "  • pre-commit:  Linting, formatting, type checks, cf:build"
echo "  • pre-push:    (Optional, can add more checks)"
echo ""
echo "To run hooks on all files (not just staged):"
echo "  pre-commit run --all-files"
echo ""
echo "To skip hooks on a specific commit:"
echo "  git commit --no-verify"
echo ""
