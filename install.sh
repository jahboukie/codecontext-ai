#!/bin/bash

# CodeContext Pro Installer
# Stop paying for AI amnesia - give your AI assistant superpowers!

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Banner
echo -e "${PURPLE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🧠 CodeContext Pro - AI Memory & Execution Superpowers     ║
║                                                               ║
║   Stop paying for AI amnesia. Give your AI assistant         ║
║   persistent memory and code execution capabilities.         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${CYAN}🚀 Starting CodeContext Pro installation...${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed.${NC}"
    echo -e "${YELLOW}Please install Node.js 16+ from https://nodejs.org${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if ! node -e "process.exit(process.version.slice(1).split('.').map(Number).reduce((a,b,i)=>(a<<8)+b) >= '$REQUIRED_VERSION'.split('.').map(Number).reduce((a,b,i)=>(a<<8)+b) ? 0 : 1)"; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old.${NC}"
    echo -e "${YELLOW}Please upgrade to Node.js 16+ from https://nodejs.org${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $NODE_VERSION detected${NC}"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not available.${NC}"
    echo -e "${YELLOW}Please install npm or use Node.js installer from https://nodejs.org${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm detected${NC}"

# Check if Docker is available (optional but recommended)
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        echo -e "${GREEN}✅ Docker detected and running${NC}"
        DOCKER_AVAILABLE=true
    else
        echo -e "${YELLOW}⚠️  Docker detected but not running${NC}"
        echo -e "${YELLOW}   Start Docker Desktop for code execution features${NC}"
        DOCKER_AVAILABLE=false
    fi
else
    echo -e "${YELLOW}⚠️  Docker not detected${NC}"
    echo -e "${YELLOW}   Install Docker Desktop for code execution features${NC}"
    DOCKER_AVAILABLE=false
fi

echo ""

# Install CodeContext Pro
echo -e "${CYAN}📦 Installing CodeContext Pro CLI...${NC}"

if npm install -g codecontext-pro; then
    echo -e "${GREEN}✅ CodeContext Pro CLI installed successfully!${NC}"
else
    echo -e "${RED}❌ Failed to install CodeContext Pro CLI${NC}"
    echo -e "${YELLOW}Try running with sudo: sudo npm install -g codecontext-pro${NC}"
    exit 1
fi

echo ""

# Verify installation
echo -e "${CYAN}🔍 Verifying installation...${NC}"

if command -v codecontext-pro &> /dev/null; then
    VERSION=$(codecontext-pro --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ CodeContext Pro CLI is ready! (version: $VERSION)${NC}"
else
    echo -e "${RED}❌ Installation verification failed${NC}"
    exit 1
fi

echo ""

# Success message
echo -e "${GREEN}🎉 Installation Complete!${NC}\n"

echo -e "${PURPLE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                    🧠 Next Steps                             ║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════════╝${NC}"

echo -e "${CYAN}1. Navigate to your project:${NC}"
echo -e "   ${YELLOW}cd your-project${NC}"
echo ""

echo -e "${CYAN}2. Initialize CodeContext Pro:${NC}"
echo -e "   ${YELLOW}codecontext-pro init${NC}"
echo ""

echo -e "${CYAN}3. Check status:${NC}"
echo -e "   ${YELLOW}codecontext-pro status${NC}"
echo ""

echo -e "${CYAN}4. Start coding with AI superpowers!${NC}"
echo -e "   Your AI assistant now has persistent memory! 🧠✨"
echo ""

if [ "$DOCKER_AVAILABLE" = false ]; then
    echo -e "${YELLOW}💡 Pro Tip: Install Docker Desktop for code execution features${NC}"
    echo -e "   ${BLUE}https://docker.com/products/docker-desktop${NC}"
    echo ""
fi

echo -e "${PURPLE}🎯 Features Unlocked:${NC}"
echo -e "   ✅ 14-day free trial with all features"
echo -e "   ✅ Persistent AI memory across sessions"
echo -e "   ✅ Code execution and verification"
echo -e "   ✅ 700 executions/month + 1,000 files tracked"
echo ""

echo -e "${CYAN}📚 Learn More:${NC}"
echo -e "   🌐 Website: ${BLUE}https://codecontextpro.com${NC}"
echo -e "   📖 Docs: ${BLUE}https://codecontextpro.com/docs${NC}"
echo -e "   🐛 Issues: ${BLUE}https://github.com/jahboukie/code-contextpro-memory/issues${NC}"
echo ""

echo -e "${GREEN}Welcome to the future of AI-human collaboration! 🚀${NC}"
echo -e "${PURPLE}No more goldfish mode - your AI assistant now remembers everything!${NC}"
