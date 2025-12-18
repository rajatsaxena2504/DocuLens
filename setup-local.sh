#!/bin/bash

# DocuLens Local Development Setup Script
# This script sets up the application to run without Docker using SQLite

set -e

echo "=========================================="
echo "DocuLens Local Development Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python 3 found${NC}"
echo -e "${GREEN}✓ Node.js found${NC}"
echo -e "${GREEN}✓ npm found${NC}"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Setup Backend
echo ""
echo "=========================================="
echo "Setting up Backend..."
echo "=========================================="

cd "$SCRIPT_DIR/backend"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating backend .env file..."
    cat > .env << 'EOF'
# Database - SQLite for local development
DATABASE_URL=sqlite:///./doculens.db

# Security
SECRET_KEY=local-dev-secret-key-change-in-production

# AI Provider Configuration (uncomment and fill in the one you want to use)
# Priority: Ollama → Databricks → Gemini → Anthropic

# 1. Ollama (Local)
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3.2

# 2. Google Gemini
# GEMINI_API_KEY=your-gemini-key
# GEMINI_MODEL=gemini-2.0-flash

# 3. Anthropic Claude
# ANTHROPIC_API_KEY=your-anthropic-key
# ANTHROPIC_MODEL=claude-3-haiku-20240307

# GitHub (optional)
# GITHUB_TOKEN=your-github-token
EOF
    echo -e "${YELLOW}⚠ Created backend/.env - Please add your AI API keys${NC}"
fi

# Seed the database
echo "Seeding database..."
python -m app.data.seed

echo -e "${GREEN}✓ Backend setup complete${NC}"

# Setup Frontend
echo ""
echo "=========================================="
echo "Setting up Frontend..."
echo "=========================================="

cd "$SCRIPT_DIR/frontend"

# Install dependencies
echo "Installing Node.js dependencies..."
npm install --silent

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating frontend .env file..."
    cat > .env << 'EOF'
VITE_API_URL=http://localhost:8000
EOF
fi

echo -e "${GREEN}✓ Frontend setup complete${NC}"

# Done
echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "To start the application, run:"
echo ""
echo "  ./run-local.sh"
echo ""
echo "Or start manually:"
echo ""
echo "  Backend:  cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Access the app at: http://localhost:5173"
echo ""
