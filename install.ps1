# CodeContext Pro Windows Installer
# Stop paying for AI amnesia - give your AI assistant superpowers!

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$Purple = "Magenta"
$Cyan = "Cyan"

# ASCII Art Banner
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor $Purple
Write-Host "║                                                               ║" -ForegroundColor $Purple
Write-Host "║   🧠 CodeContext Pro - AI Memory & Execution Superpowers     ║" -ForegroundColor $Purple
Write-Host "║                                                               ║" -ForegroundColor $Purple
Write-Host "║   Stop paying for AI amnesia. Give your AI assistant         ║" -ForegroundColor $Purple
Write-Host "║   persistent memory and code execution capabilities.         ║" -ForegroundColor $Purple
Write-Host "║                                                               ║" -ForegroundColor $Purple
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor $Purple
Write-Host ""

Write-Host "🚀 Starting CodeContext Pro installation..." -ForegroundColor $Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor $Green
        
        # Check if version is 16+
        $versionNumber = $nodeVersion -replace 'v', ''
        $majorVersion = [int]($versionNumber.Split('.')[0])
        
        if ($majorVersion -lt 16) {
            Write-Host "❌ Node.js version $nodeVersion is too old." -ForegroundColor $Red
            Write-Host "Please upgrade to Node.js 16+ from https://nodejs.org" -ForegroundColor $Yellow
            exit 1
        }
    }
} catch {
    Write-Host "❌ Node.js is not installed." -ForegroundColor $Red
    Write-Host "Please install Node.js 16+ from https://nodejs.org" -ForegroundColor $Yellow
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "✅ npm $npmVersion detected" -ForegroundColor $Green
    }
} catch {
    Write-Host "❌ npm is not available." -ForegroundColor $Red
    Write-Host "Please install npm or use Node.js installer from https://nodejs.org" -ForegroundColor $Yellow
    exit 1
}

# Check if Docker is available (optional but recommended)
$dockerAvailable = $false
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        try {
            docker info 2>$null | Out-Null
            Write-Host "✅ Docker detected and running" -ForegroundColor $Green
            $dockerAvailable = $true
        } catch {
            Write-Host "⚠️  Docker detected but not running" -ForegroundColor $Yellow
            Write-Host "   Start Docker Desktop for code execution features" -ForegroundColor $Yellow
        }
    }
} catch {
    Write-Host "⚠️  Docker not detected" -ForegroundColor $Yellow
    Write-Host "   Install Docker Desktop for code execution features" -ForegroundColor $Yellow
}

Write-Host ""

# Install CodeContext Pro
Write-Host "📦 Installing CodeContext Pro CLI..." -ForegroundColor $Cyan

try {
    npm install -g codecontext-pro
    Write-Host "✅ CodeContext Pro CLI installed successfully!" -ForegroundColor $Green
} catch {
    Write-Host "❌ Failed to install CodeContext Pro CLI" -ForegroundColor $Red
    Write-Host "Try running PowerShell as Administrator" -ForegroundColor $Yellow
    exit 1
}

Write-Host ""

# Verify installation
Write-Host "🔍 Verifying installation..." -ForegroundColor $Cyan

try {
    $version = codecontext-pro --version 2>$null
    if ($version) {
        Write-Host "✅ CodeContext Pro CLI is ready! (version: $version)" -ForegroundColor $Green
    } else {
        Write-Host "✅ CodeContext Pro CLI is ready!" -ForegroundColor $Green
    }
} catch {
    Write-Host "❌ Installation verification failed" -ForegroundColor $Red
    exit 1
}

Write-Host ""

# Success message
Write-Host "🎉 Installation Complete!" -ForegroundColor $Green
Write-Host ""

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor $Purple
Write-Host "║                    🧠 Next Steps                             ║" -ForegroundColor $Purple
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor $Purple

Write-Host "1. Navigate to your project:" -ForegroundColor $Cyan
Write-Host "   cd your-project" -ForegroundColor $Yellow
Write-Host ""

Write-Host "2. Initialize CodeContext Pro:" -ForegroundColor $Cyan
Write-Host "   codecontext-pro init" -ForegroundColor $Yellow
Write-Host ""

Write-Host "3. Check status:" -ForegroundColor $Cyan
Write-Host "   codecontext-pro status" -ForegroundColor $Yellow
Write-Host ""

Write-Host "4. Start coding with AI superpowers!" -ForegroundColor $Cyan
Write-Host "   Your AI assistant now has persistent memory! 🧠✨"
Write-Host ""

if (-not $dockerAvailable) {
    Write-Host "💡 Pro Tip: Install Docker Desktop for code execution features" -ForegroundColor $Yellow
    Write-Host "   https://docker.com/products/docker-desktop" -ForegroundColor $Blue
    Write-Host ""
}

Write-Host "🎯 Features Unlocked:" -ForegroundColor $Purple
Write-Host "   ✅ 14-day free trial with all features"
Write-Host "   ✅ Persistent AI memory across sessions"
Write-Host "   ✅ Code execution and verification"
Write-Host "   ✅ 700 executions/month + 1,000 files tracked"
Write-Host ""

Write-Host "📚 Learn More:" -ForegroundColor $Cyan
Write-Host "   🌐 Website: https://codecontextpro.com" -ForegroundColor $Blue
Write-Host "   📖 Docs: https://codecontextpro.com/docs" -ForegroundColor $Blue
Write-Host "   🐛 Issues: https://github.com/jahboukie/code-contextpro-memory/issues" -ForegroundColor $Blue
Write-Host ""

Write-Host "Welcome to the future of AI-human collaboration! 🚀" -ForegroundColor $Green
Write-Host "No more goldfish mode - your AI assistant now remembers everything!" -ForegroundColor $Purple

# Pause to let user read the output
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor $Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
