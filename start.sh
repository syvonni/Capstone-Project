#!/bin/bash
#
# One-Command Start Script
# 
# This script starts Docker services, web frontend, and automatically opens browser tabs
# when everything is ready. No need to remember commands!
#
# Usage:
#   ./start.sh              # Default: dev mode + web-only (auto-reload, just opens web app)
#   ./start.sh --demo       # Security demo (production build on 4173, no FAB/prefill; uses same API)
#   ./start.sh --demo-ui    # Demo UI on dev server (5173): hot reload, no FAB/prefill, same API
#   ./start.sh --production # Full reset (containers + volumes; DB empty) then start
#   ./start.sh --no-dev     # Disable dev mode (no auto-reload)
#   ./start.sh --all-tabs   # Open all browser tabs (IPFS, API health, Dozzle) instead of just web
#   ./start.sh --clean      # Clean up unused Docker resources before starting
#   ./start.sh --rebuild    # Rebuild all Docker images (fixes missing dependencies)
#   ./start.sh --retrain    # Retrain LOB AI model from dataset on startup, then start
#   ./start.sh --status     # Just show status, don't start anything
#   ./start.sh --ipfs-list  # List IPFS documents from application submissions (no start)
#   ./start.sh --eval-lob   # Evaluate LOB model accuracy (Top-1/3/5, F1) and exit
#   ./start.sh --test       # Run all tests (backend, web, blockchain)
#   ./start.sh --skip-ipfs  # Skip IPFS (use when IPFS container fails)
#   ./start.sh --slow-network  # Use longer wait times (for slow or high-latency networks)
#   ./start.sh --atlas      # Use MongoDB Atlas instead of local MongoDB (set MONGO_URI in .env)
#   ./start.sh --web-only   # Only open the web app tab (default; use --all-tabs to override)
#   ./start.sh --ganache-gui   # Use Ganache GUI on port 7545 instead of Docker Ganache
#   ./start.sh --ngrok      # Start ngrok tunnel for HTTPS/WebAuthn access (for mobile testing)
#   ./start.sh --iphone     # Run mobile app on iOS iPhone simulator (no Docker/web)
#   ./start.sh --android    # Run mobile app on Android emulator/device (no Docker/web)
#
# First Run: .env files are auto-created from .env.development templates if missing.
#            Seeding is enabled by default (SEED_DEV=true) for test accounts.
#
# Email: The script checks email config but won't block startup. Mock emails
# work in dev mode (codes shown in terminal). Use --skip-email-check to skip it.
#
# Note: --production cannot be combined with --dev or --clean. --demo cannot be combined with --dev, --production, or --clean.

# Don't exit on error - we want to continue even if web server fails
set +e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ================================
# Environment Setup (Auto-populate .env files)
# ================================
setup_env_files() {
  local PROJECT_ROOT
  PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
  local ENV_CREATED=false
  local HAS_ERRORS=false
  
  # Root .env
  if [ ! -f "$PROJECT_ROOT/.env" ]; then
    if [ -f "$PROJECT_ROOT/.env.development" ]; then
      cp "$PROJECT_ROOT/.env.development" "$PROJECT_ROOT/.env"
      ENV_CREATED=true
    else
      HAS_ERRORS=true
    fi
  fi
  
  # Backend .env
  if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    if [ -f "$PROJECT_ROOT/backend/.env.development" ]; then
      cp "$PROJECT_ROOT/backend/.env.development" "$PROJECT_ROOT/backend/.env"
      ENV_CREATED=true
    else
      HAS_ERRORS=true
    fi
  fi
  
  # Web .env
  if [ ! -f "$PROJECT_ROOT/web/.env" ]; then
    if [ -f "$PROJECT_ROOT/web/.env.development" ]; then
      cp "$PROJECT_ROOT/web/.env.development" "$PROJECT_ROOT/web/.env"
      ENV_CREATED=true
    else
      HAS_ERRORS=true
    fi
  fi
  
  # Mobile .env
  if [ ! -f "$PROJECT_ROOT/mobile/app/.env" ]; then
    if [ -f "$PROJECT_ROOT/mobile/app/.env.development" ]; then
      cp "$PROJECT_ROOT/mobile/app/.env.development" "$PROJECT_ROOT/mobile/app/.env"
      ENV_CREATED=true
    else
      HAS_ERRORS=true
    fi
  fi
  
  # Only show output if there are errors or files were created
  if [ "$HAS_ERRORS" = true ] || [ "$ENV_CREATED" = true ]; then
    echo ""
    echo -e "${CYAN}🔧 Checking environment configuration...${NC}"
    
    # Root .env
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
      echo -e "${YELLOW}   ⚠️  No .env or .env.development found in root${NC}"
    elif [ "$ENV_CREATED" = true ]; then
      echo -e "${GREEN}   ✅ Created .env from .env.development${NC}"
    fi
    
    # Backend .env
    if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
      echo -e "${YELLOW}   ⚠️  No backend/.env or backend/.env.development found${NC}"
    elif [ "$ENV_CREATED" = true ]; then
      echo -e "${GREEN}   ✅ Created backend/.env from backend/.env.development${NC}"
    fi
    
    # Web .env
    if [ ! -f "$PROJECT_ROOT/web/.env" ]; then
      echo -e "${YELLOW}   ⚠️  No web/.env or web/.env.development found${NC}"
    elif [ "$ENV_CREATED" = true ]; then
      echo -e "${GREEN}   ✅ Created web/.env from web/.env.development${NC}"
    fi
    
    # Mobile .env
    if [ ! -f "$PROJECT_ROOT/mobile/app/.env" ]; then
      echo -e "${YELLOW}   ⚠️  No mobile/app/.env or mobile/app/.env.development found${NC}"
    elif [ "$ENV_CREATED" = true ]; then
      echo -e "${GREEN}   ✅ Created mobile/app/.env from mobile/app/.env.development${NC}"
    fi
    
    if [ "$ENV_CREATED" = true ]; then
      echo -e "${CYAN}   ℹ️  Environment files created from development templates.${NC}"
      echo -e "${CYAN}      These use shared development credentials (free tier APIs).${NC}"
      echo -e "${CYAN}      For production, edit .env files with your own secrets.${NC}"
    fi
    echo ""
  fi
}

# Run env setup immediately
setup_env_files

# Print LAN URLs that can be opened from other devices on the same network.
print_lan_web_urls() {
  local port="$1"
  local lan_ips
  lan_ips=$(ifconfig 2>/dev/null | awk '/inet / {print $2}' | grep -E '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' | sort -u)

  if [ -z "$lan_ips" ]; then
    echo -e "${YELLOW}   ⚠️  Could not detect a LAN IPv4 address for this machine.${NC}"
    return
  fi

  echo -e "${CYAN}LAN access (same Wi-Fi/LAN):${NC}"
  while IFS= read -r ip; do
    [ -z "$ip" ] && continue
    echo -e "   • http://${ip}:${port}"
  done <<< "$lan_ips"
}

# Read MONGO_URI from env or .env without printing secrets.
get_effective_mongo_uri() {
  if [ -n "${MONGO_URI:-}" ]; then
    printf '%s' "$MONGO_URI"
    return 0
  fi

  if [ -f ".env" ]; then
    local line
    line=$(grep -E '^[[:space:]]*MONGO_URI=' .env | tail -n 1)
    line=${line#*=}
    line=$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    line=${line%\"}
    line=${line#\"}
    line=${line%\'}
    line=${line#\'}
    printf '%s' "$line"
  fi
}

append_unique_query_param() {
  local query="$1"
  local pair="$2"
  local key="${pair%%=*}"
  [ -z "$pair" ] && { printf '%s' "$query"; return 0; }

  if [ -n "$query" ] && echo "$query" | tr '&' '\n' | grep -q "^${key}="; then
    printf '%s' "$query"
    return 0
  fi

  if [ -n "$query" ]; then
    printf '%s' "${query}&${pair}"
  else
    printf '%s' "$pair"
  fi
}

# Convert mongodb+srv:// URI to explicit mongodb://hosts URI.
# This avoids runtime SRV/TXT lookups inside containers (common Atlas DNS failure mode in Docker).
expand_atlas_srv_uri() {
  local input_uri="$1"
  if [[ "$input_uri" != mongodb+srv://* ]]; then
    printf '%s' "$input_uri"
    return 0
  fi

  local without_scheme authority remainder
  without_scheme="${input_uri#mongodb+srv://}"
  if [[ "$without_scheme" == */* ]]; then
    authority="${without_scheme%%/*}"
    remainder="${without_scheme#*/}"
  else
    authority="$without_scheme"
    remainder=""
  fi

  local auth_part cluster_host
  if [[ "$authority" == *@* ]]; then
    auth_part="${authority%@*}"
    cluster_host="${authority##*@}"
  else
    auth_part=""
    cluster_host="$authority"
  fi

  local db_path query
  db_path="$remainder"
  query=""
  if [[ "$remainder" == *\?* ]]; then
    db_path="${remainder%%\?*}"
    query="${remainder#*\?}"
  fi

  local srv_hosts txt_params
  srv_hosts=$(nslookup -type=SRV "_mongodb._tcp.${cluster_host}" 2>/dev/null | awk '/service =/ {print $NF}' | sed 's/\.$//' | paste -sd, -)
  txt_params=$(nslookup -type=TXT "$cluster_host" 2>/dev/null | sed -n 's/.*text = "\(.*\)".*/\1/p' | paste -sd'&' -)

  if [ -z "$srv_hosts" ]; then
    return 1
  fi

  local combined_query
  combined_query="$query"
  if [ -n "$txt_params" ]; then
    local p
    while IFS= read -r p; do
      [ -z "$p" ] && continue
      combined_query=$(append_unique_query_param "$combined_query" "$p")
    done < <(echo "$txt_params" | tr '&' '\n')
  fi
  combined_query=$(append_unique_query_param "$combined_query" "tls=true")

  local auth_prefix new_uri
  auth_prefix=""
  [ -n "$auth_part" ] && auth_prefix="${auth_part}@"

  if [ -n "$db_path" ]; then
    new_uri="mongodb://${auth_prefix}${srv_hosts}/${db_path}"
  else
    new_uri="mongodb://${auth_prefix}${srv_hosts}/"
  fi
  if [ -n "$combined_query" ]; then
    new_uri="${new_uri}?${combined_query}"
  fi

  printf '%s' "$new_uri"
}

# Atlas preflight + export adjusted MONGO_URI for this script execution.
prepare_atlas_mongo_uri() {
  local effective_uri
  effective_uri=$(get_effective_mongo_uri)
  if [ -z "$effective_uri" ]; then
    echo -e "${RED}❌ --atlas set but MONGO_URI is empty.${NC}"
    echo -e "${YELLOW}   Set MONGO_URI in .env (see docs/deployment/atlas.md).${NC}"
    return 1
  fi

  if [[ "$effective_uri" != mongodb+srv://* ]]; then
    export MONGO_URI="$effective_uri"
    echo -e "${GREEN}   ✅ Atlas preflight: using explicit MongoDB URI.${NC}"
    return 0
  fi

  local authority cluster_host
  authority="${effective_uri#mongodb+srv://}"
  authority="${authority%%/*}"
  cluster_host="${authority##*@}"

  echo -e "${CYAN}   Checking Atlas DNS records for ${cluster_host}...${NC}"
  if ! nslookup -type=TXT "$cluster_host" >/dev/null 2>&1; then
    echo -e "${RED}   ❌ Atlas TXT lookup failed for ${cluster_host}.${NC}"
    echo -e "${YELLOW}   Try: nslookup -type=TXT ${cluster_host}${NC}"
    return 1
  fi
  if ! nslookup -type=SRV "_mongodb._tcp.${cluster_host}" >/dev/null 2>&1; then
    echo -e "${RED}   ❌ Atlas SRV lookup failed for ${cluster_host}.${NC}"
    echo -e "${YELLOW}   Try: nslookup -type=SRV _mongodb._tcp.${cluster_host}${NC}"
    return 1
  fi

  local expanded_uri
  expanded_uri=$(expand_atlas_srv_uri "$effective_uri")
  if [ -z "$expanded_uri" ]; then
    echo -e "${RED}   ❌ Failed to expand Atlas SRV URI to explicit hosts.${NC}"
    return 1
  fi

  export MONGO_URI="$expanded_uri"
  echo -e "${GREEN}   ✅ Atlas preflight passed (using expanded host list; no in-container SRV/TXT dependency).${NC}"
  return 0
}

# Parse arguments
# Defaults: dev mode + web-only for easy onboarding (./start.sh just works)
DEV_MODE=true
DEMO_MODE=false
DEMO_UI_MODE=false
PRODUCTION_MODE=false
SKIP_IPFS=false
CLEAN_DOCKER=false
STATUS_ONLY=false
TEST_MODE=false
IPFS_LIST_ONLY=false
EVAL_LOB=false
SLOW_NETWORK=false
ATLAS_MODE=false
OPEN_WEB_ONLY=true
RETRAIN_LOB=false
GANACHE_GUI=false
SKIP_EMAIL_CHECK=false
MOBILE_IPHONE=false
MOBILE_ANDROID=false
REBUILD_IMAGES=false
NGROK_MODE=false

for arg in "$@"; do
  case $arg in
    --dev|-d)
      DEV_MODE=true
      ;;
    --no-dev)
      DEV_MODE=false
      ;;
    --demo|-D)
      DEMO_MODE=true
      DEV_MODE=false
      ;;
    --demo-ui)
      DEMO_UI_MODE=true
      ;;
    --production|-p)
      PRODUCTION_MODE=true
      DEV_MODE=false
      ;;
    --skip-ipfs)
      SKIP_IPFS=true
      ;;
    --clean)
      CLEAN_DOCKER=true
      ;;
    --rebuild|-r)
      REBUILD_IMAGES=true
      ;;
    --retrain)
      RETRAIN_LOB=true
      ;;
    --status)
      STATUS_ONLY=true
      ;;
    --ipfs-list)
      IPFS_LIST_ONLY=true
      ;;
    --eval-lob)
      EVAL_LOB=true
      ;;
    --test|-t)
      TEST_MODE=true
      ;;
    --slow-network|-s)
      SLOW_NETWORK=true
      ;;
    --atlas|-a)
      ATLAS_MODE=true
      ;;
    --web-only)
      OPEN_WEB_ONLY=true
      ;;
    --all-tabs)
      OPEN_WEB_ONLY=false
      ;;
    --ganache-gui)
      GANACHE_GUI=true
      ;;
    --skip-email-check)
      SKIP_EMAIL_CHECK=true
      ;;
    --iphone)
      MOBILE_IPHONE=true
      ;;
    --android)
      MOBILE_ANDROID=true
      ;;
    --ngrok)
      NGROK_MODE=true
      ;;
  esac
done

# Wait times (longer when --slow-network)
WAIT_AFTER_DOCKER=5
WAIT_AFTER_WEB=2
WAIT_BEFORE_BROWSER=3
if [ "$SLOW_NETWORK" = true ]; then
  WAIT_AFTER_DOCKER=15
  WAIT_AFTER_WEB=5
  WAIT_BEFORE_BROWSER=10
fi

# --production cannot be used with --dev or --clean
if [ "$PRODUCTION_MODE" = true ]; then
  if [ "$DEV_MODE" = true ]; then
    echo -e "${RED}Error: --production cannot be used with --dev.${NC}"
    echo -e "   Use either ./start.sh --production or ./start.sh --dev"
    exit 1
  fi
  if [ "$CLEAN_DOCKER" = true ]; then
    echo -e "${RED}Error: --production cannot be used with --clean.${NC}"
    echo -e "   Use either ./start.sh --production or ./start.sh --clean [--dev]"
    exit 1
  fi
fi

# --demo cannot be used with --dev, --production, or --clean
if [ "$DEMO_MODE" = true ]; then
  if [ "$DEV_MODE" = true ] || [ "$DEMO_UI_MODE" = true ]; then
    echo -e "${RED}Error: --demo cannot be used with --dev or --demo-ui.${NC}"
    exit 1
  fi
  if [ "$PRODUCTION_MODE" = true ]; then
    echo -e "${RED}Error: --demo cannot be used with --production.${NC}"
    exit 1
  fi
  if [ "$CLEAN_DOCKER" = true ]; then
    echo -e "${RED}Error: --demo cannot be used with --clean.${NC}"
    exit 1
  fi
fi
# --demo-ui cannot be combined with --demo or --production
if [ "$DEMO_UI_MODE" = true ]; then
  if [ "$DEMO_MODE" = true ]; then
    echo -e "${RED}Error: --demo-ui cannot be used with --demo.${NC}"
    exit 1
  fi
  if [ "$PRODUCTION_MODE" = true ]; then
    echo -e "${RED}Error: --demo-ui cannot be used with --production.${NC}"
    exit 1
  fi
fi

# ================================
# Check for Already Running Services
# ================================
check_running_services() {
  local running_containers=$(docker ps --filter "name=capstone-" --format "{{.Names}}" 2>/dev/null | wc -l | tr -d ' ')
  echo "$running_containers"
}

show_status() {
  echo ""
  echo -e "${CYAN}📊 Docker Status:${NC}"
  
  # Check running containers
  local running=$(check_running_services)
  if [ "$running" -gt 0 ]; then
    echo -e "${GREEN}   ✅ $running Capstone containers running:${NC}"
    docker ps --filter "name=capstone-" --format "      • {{.Names}} ({{.Status}})" 2>/dev/null
  else
    echo -e "${YELLOW}   ⚠️  No Capstone containers running${NC}"
  fi
  
  # Check web server
  if pgrep -f "vite.*5173" > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Web dev server running on port 5173${NC}"
  else
    echo -e "${YELLOW}   ⚠️  Web dev server not running${NC}"
  fi
  
  # Show Docker disk usage
  echo ""
  echo -e "${CYAN}💾 Docker Disk Usage:${NC}"
  docker system df --format "   {{.Type}}: {{.Size}} ({{.Reclaimable}} reclaimable)" 2>/dev/null
  
  # Calculate total
  local total_size=$(docker system df --format "{{.Size}}" 2>/dev/null | awk '{
    gsub(/GB/, "*1024"); gsub(/MB/, "*1"); gsub(/kB/, "/1024"); 
    sum += $1
  } END { printf "%.1f", sum/1024 }')
  echo ""
  echo -e "${CYAN}   Total Docker usage: ~${total_size}GB${NC}"
}

# If --status flag, just show status and exit
if [ "$STATUS_ONLY" = true ]; then
  show_status
  echo ""
  echo -e "${CYAN}💡 Commands:${NC}"
  echo -e "   • Start services: ./start.sh --dev"
  echo -e "   • Stop services:  ./stop.sh"
  echo -e "   • Production:     ./start.sh --production  (full reset + empty DB)"
  echo -e "   • MongoDB Atlas:  ./start.sh --atlas  (set MONGO_URI in .env; see docs/deployment/atlas.md)"
  echo -e "   • Clean Docker:   ./start.sh --clean --dev"
  echo -e "   • Run all tests:  ./start.sh --test"
  echo -e "   • List IPFS docs: ./start.sh --ipfs-list"
  echo -e "   • Evaluate LOB:   ./start.sh --eval-lob"
  exit 0
fi

# If --eval-lob flag, run LOB model evaluation and exit
if [ "$EVAL_LOB" = true ]; then
  echo ""
  echo -e "${CYAN}📊 LOB Model Evaluation${NC}"
  echo -e "${CYAN}========================${NC}"
  PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
  if [ -f "${PROJECT_ROOT}/ai/scripts/evaluate_lob_model.py" ]; then
    (cd "${PROJECT_ROOT}" && python3 ai/scripts/evaluate_lob_model.py) || exit 1
  else
    echo -e "${RED}   Script not found: ai/scripts/evaluate_lob_model.py${NC}"
    exit 1
  fi
  exit 0
fi

# If --ipfs-list flag, run browse script and exit
if [ "$IPFS_LIST_ONLY" = true ]; then
  echo ""
  echo -e "${CYAN}📁 IPFS documents from application submissions${NC}"
  echo -e "${CYAN}================================================${NC}"
  PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
  if [ -f "${PROJECT_ROOT}/backend/services/business-service/scripts/browseApplicationIpfs.js" ]; then
    (cd "${PROJECT_ROOT}" && node backend/services/business-service/scripts/browseApplicationIpfs.js) || exit 1
  else
    echo -e "${RED}   Script not found: backend/services/business-service/scripts/browseApplicationIpfs.js${NC}"
    exit 1
  fi
  exit 0
fi

# If --iphone flag, run mobile app on iPhone simulator and exit
if [ "$MOBILE_IPHONE" = true ]; then
  echo ""
  echo -e "${CYAN}📱 Running mobile app on iPhone simulator${NC}"
  echo -e "${CYAN}==========================================${NC}"
  PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
  if [ -x "${PROJECT_ROOT}/mobile/app/run_on_simulator.sh" ]; then
    exec "${PROJECT_ROOT}/mobile/app/run_on_simulator.sh" --iphone
  else
    echo -e "${RED}   Script not found or not executable: mobile/app/run_on_simulator.sh${NC}"
    exit 1
  fi
fi

# If --android flag, run mobile app on Android emulator/device and exit
if [ "$MOBILE_ANDROID" = true ]; then
  echo ""
  echo -e "${CYAN}📱 Running mobile app on Android emulator/device${NC}"
  echo -e "${CYAN}==================================================${NC}"
  PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
  if [ -x "${PROJECT_ROOT}/mobile/app/run_on_android.sh" ]; then
    exec "${PROJECT_ROOT}/mobile/app/run_on_android.sh"
  else
    echo -e "${RED}   Script not found or not executable: mobile/app/run_on_android.sh${NC}"
    exit 1
  fi
fi

# ================================
# Run All Tests (--test flag)
# ================================
run_all_tests() {
  echo ""
  echo -e "${CYAN}🧪 Running All Tests${NC}"
  echo -e "${CYAN}===================${NC}"
  
  local TOTAL_PASSED=0
  local TOTAL_FAILED=0
  local FAILED_SUITES=""
  
  # Single persistent error log (overwritten each run)
  local PROJECT_ROOT
  PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)
  local TEST_LOG_FILE="${PROJECT_ROOT}/test-results.log"
  : > "$TEST_LOG_FILE"  # Truncate at start of each run
  echo "Test run started at $(date)" >> "$TEST_LOG_FILE"
  echo "========================================" >> "$TEST_LOG_FILE"
  
  # Create temp directory for per-suite output (used during run)
  local ERROR_LOG_DIR=$(mktemp -d)
  trap "rm -rf $ERROR_LOG_DIR" EXIT
  
  # Backend Tests (Jest)
  echo ""
  echo -e "${BLUE}📦 Backend Tests (Jest)${NC}"
  echo -e "${BLUE}------------------------${NC}"
  if [ -d "backend" ] && [ -f "backend/package.json" ]; then
    cd backend
    if [ ! -d "node_modules" ]; then
      echo -e "${YELLOW}   Installing backend dependencies...${NC}"
      npm install --silent
    fi
    echo -e "${CYAN}   Running backend tests...${NC}"
    local BACKEND_OUTPUT="$ERROR_LOG_DIR/backend.log"
    # Run tests and capture output (portable: avoids script -q which differs on Linux/macOS/Conda)
    npm test 2>&1 | tee "$BACKEND_OUTPUT"
    local BACKEND_EXIT=${PIPESTATUS[0]}
    local BACKEND_SUMMARY
    BACKEND_SUMMARY=$(sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/\x1b\[[?][0-9]*[a-zA-Z]//g' "$BACKEND_OUTPUT" 2>/dev/null | tr -d '\r' | grep -E "(Test Suites:|Tests:|Snapshots:|Time:)" || true)
    if [ $BACKEND_EXIT -eq 0 ]; then
      echo -e "${GREEN}   ✅ Backend tests passed${NC}"
      ((TOTAL_PASSED++))
      echo "[PASS] Backend (Jest)" >> "$TEST_LOG_FILE"
    else
      echo -e "${RED}   ❌ Backend tests failed (errors captured for summary)${NC}"
      ((TOTAL_FAILED++))
      FAILED_SUITES="${FAILED_SUITES}backend "
      echo "[FAIL] Backend (Jest)" >> "$TEST_LOG_FILE"
    fi
    if [ -n "$BACKEND_SUMMARY" ]; then
      echo "$BACKEND_SUMMARY" >> "$TEST_LOG_FILE"
    fi
    echo "" >> "$TEST_LOG_FILE"
    cd ..
  else
    echo -e "${YELLOW}   ⚠️  Backend directory not found, skipping${NC}"
  fi
  
  # Web Unit Tests (Vitest)
  echo ""
  echo -e "${BLUE}🌐 Web Unit Tests (Vitest)${NC}"
  echo -e "${BLUE}---------------------------${NC}"
  if [ -d "web" ] && [ -f "web/package.json" ]; then
    cd web
    if [ ! -d "node_modules" ]; then
      echo -e "${YELLOW}   Installing web dependencies...${NC}"
      npm install --silent
    fi
    echo -e "${CYAN}   Running web unit tests...${NC}"
    local WEB_UNIT_OUTPUT="$ERROR_LOG_DIR/web-unit.log"
    npm run test -- --run 2>&1 | tee "$WEB_UNIT_OUTPUT"
    local WEB_UNIT_EXIT=${PIPESTATUS[0]}
    local WEB_UNIT_SUMMARY
    WEB_UNIT_SUMMARY=$(sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/\x1b\[[?][0-9]*[a-zA-Z]//g' "$WEB_UNIT_OUTPUT" 2>/dev/null | tr -d '\r' | grep -E "(Test Files|Tests |Start at|Duration)" | tail -4 || true)
    if [ $WEB_UNIT_EXIT -eq 0 ]; then
      echo -e "${GREEN}   ✅ Web unit tests passed${NC}"
      ((TOTAL_PASSED++))
      echo "[PASS] Web Unit (Vitest)" >> "$TEST_LOG_FILE"
    else
      echo -e "${RED}   ❌ Web unit tests failed (errors captured for summary)${NC}"
      ((TOTAL_FAILED++))
      FAILED_SUITES="${FAILED_SUITES}web-unit "
      echo "[FAIL] Web Unit (Vitest)" >> "$TEST_LOG_FILE"
    fi
    if [ -n "$WEB_UNIT_SUMMARY" ]; then
      echo "$WEB_UNIT_SUMMARY" >> "$TEST_LOG_FILE"
    fi
    echo "" >> "$TEST_LOG_FILE"
    cd ..
  else
    echo -e "${YELLOW}   ⚠️  Web directory not found, skipping${NC}"
  fi
  
  # Web E2E Tests (Playwright)
  echo ""
  echo -e "${BLUE}🎭 Web E2E Tests (Playwright)${NC}"
  echo -e "${BLUE}------------------------------${NC}"
  if [ -d "web" ] && [ -f "web/package.json" ]; then
    cd web
    # Install Playwright browsers if not already installed
    # Check by counting browser directories in the cache
    PW_CACHE="$HOME/.cache/ms-playwright"
    BROWSER_COUNT=$(find "$PW_CACHE" -maxdepth 1 -type d 2>/dev/null | wc -l)
    if [ "$BROWSER_COUNT" -lt 2 ]; then
      echo -e "${YELLOW}   Installing Playwright browsers (chromium only; set PLAYWRIGHT_WEBKIT=1 for webkit)...${NC}"
      npx playwright install chromium 2>&1
      echo -e "${GREEN}   Playwright browsers installed${NC}"
    fi
    echo -e "${CYAN}   Running web e2e tests...${NC}"
    local WEB_E2E_OUTPUT="$ERROR_LOG_DIR/web-e2e.log"
    npm run test:e2e 2>&1 | tee "$WEB_E2E_OUTPUT"
    local WEB_E2E_EXIT=${PIPESTATUS[0]}
    local WEB_E2E_SUMMARY
    WEB_E2E_SUMMARY=$(sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/\x1b\[[?][0-9]*[a-zA-Z]//g' "$WEB_E2E_OUTPUT" 2>/dev/null | tr -d '\r' | grep -E "([0-9]+ (passed|failed)|slow test)" | tail -4 || true)
    if [ $WEB_E2E_EXIT -eq 0 ]; then
      echo -e "${GREEN}   ✅ Web e2e tests passed${NC}"
      ((TOTAL_PASSED++))
      echo "[PASS] Web E2E (Playwright)" >> "$TEST_LOG_FILE"
    else
      echo -e "${RED}   ❌ Web e2e tests failed (errors captured for summary)${NC}"
      ((TOTAL_FAILED++))
      FAILED_SUITES="${FAILED_SUITES}web-e2e "
      echo "[FAIL] Web E2E (Playwright)" >> "$TEST_LOG_FILE"
    fi
    if [ -n "$WEB_E2E_SUMMARY" ]; then
      echo "$WEB_E2E_SUMMARY" >> "$TEST_LOG_FILE"
    fi
    echo "" >> "$TEST_LOG_FILE"
    cd ..
  else
    echo -e "${YELLOW}   ⚠️  Web directory not found, skipping${NC}"
  fi
  
  # Blockchain Tests (Truffle)
  echo ""
  echo -e "${BLUE}⛓️  Blockchain Tests (Truffle)${NC}"
  echo -e "${BLUE}-------------------------------${NC}"
  if [ -d "blockchain" ] && [ -f "blockchain/package.json" ]; then
    cd blockchain
    if [ ! -d "node_modules" ]; then
      echo -e "${YELLOW}   Installing blockchain dependencies...${NC}"
      npm install --silent
    fi
    # Check if Ganache is running (required for Truffle tests)
    if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "ganache"; then
      echo -e "${CYAN}   Running blockchain tests...${NC}"
      local BLOCKCHAIN_OUTPUT="$ERROR_LOG_DIR/blockchain.log"
      npm test 2>&1 | tee "$BLOCKCHAIN_OUTPUT"
      local BLOCKCHAIN_EXIT=${PIPESTATUS[0]}
      local BLOCKCHAIN_SUMMARY
      BLOCKCHAIN_SUMMARY=$(sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/\x1b\[[?][0-9]*[a-zA-Z]//g' "$BLOCKCHAIN_OUTPUT" 2>/dev/null | tr -d '\r' | grep -E "(passing|failing|pending)" || true)
      if [ $BLOCKCHAIN_EXIT -eq 0 ]; then
        echo -e "${GREEN}   ✅ Blockchain tests passed${NC}"
        ((TOTAL_PASSED++))
        echo "[PASS] Blockchain (Truffle)" >> "$TEST_LOG_FILE"
      else
        echo -e "${RED}   ❌ Blockchain tests failed (errors captured for summary)${NC}"
        ((TOTAL_FAILED++))
        FAILED_SUITES="${FAILED_SUITES}blockchain "
        echo "[FAIL] Blockchain (Truffle)" >> "$TEST_LOG_FILE"
      fi
      if [ -n "$BLOCKCHAIN_SUMMARY" ]; then
        echo "$BLOCKCHAIN_SUMMARY" >> "$TEST_LOG_FILE"
      fi
      echo "" >> "$TEST_LOG_FILE"
    else
      echo -e "${YELLOW}   ⚠️  Ganache not running - skipping blockchain tests${NC}"
      echo -e "${YELLOW}   💡 Start services first: ./start.sh --dev${NC}"
    fi
    cd ..
  else
    echo -e "${YELLOW}   ⚠️  Blockchain directory not found, skipping${NC}"
  fi
  
  # Summary
  echo ""
  echo -e "${CYAN}======================================${NC}"
  echo -e "${CYAN}📊 Test Summary${NC}"
  echo -e "${CYAN}======================================${NC}"
  echo -e "   Passed: ${GREEN}$TOTAL_PASSED${NC}"
  echo -e "   Failed: ${RED}$TOTAL_FAILED${NC}"
  
  if [ $TOTAL_FAILED -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed test suites: $FAILED_SUITES${NC}"
    
    # Display error details for each failed suite
    echo ""
    echo -e "${CYAN}======================================${NC}"
    echo -e "${RED}📋 Error Details${NC}"
    echo -e "${CYAN}======================================${NC}"
    
    # Function to extract and display errors from log (also appends to persistent log file)
    display_errors() {
      local suite_name=$1
      local log_file=$2
      local max_lines=${3:-100}  # Default to 100 lines max per suite
      local persist_log=${4:-}    # Optional: path to persistent error log
      
      if [ -f "$log_file" ] && [ -s "$log_file" ]; then
        echo ""
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}❌ $suite_name Errors:${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        # Extract relevant error lines (filter out noise, keep failures/errors)
        # For Jest/Vitest: Look for FAIL, Error, expect, AssertionError
        # For Playwright: Look for Error, failed, expect
        # For Truffle: Look for Error, failing, AssertionError
        
        local error_output
        error_output=$(grep -E -i "(FAIL|Error:|error|expect\(|AssertionError|failing|failed|✗|✘|×|at Object\.|at Test\.|at Context\.|Received:|Expected:|Difference:|- Expected|+ Received)" "$log_file" 2>/dev/null | head -n "$max_lines")
        
        if [ -z "$error_output" ]; then
          error_output=$(tail -n 50 "$log_file")
          echo -e "${CYAN}(Showing last 50 lines of output)${NC}"
        fi
        echo "$error_output"
        
        # Append to persistent log file (strip ANSI codes for clean plain text)
        if [ -n "$persist_log" ]; then
          {
            echo ""
            echo "========================================"
            echo "❌ $suite_name Errors"
            echo "========================================"
            echo "$error_output" | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | sed 's/\x1b\[[?][0-9]*[a-zA-Z]//g' | tr -d '\r'
          } >> "$persist_log"
        fi
        
        # Show full log path
        echo ""
        echo -e "${CYAN}   Full log: $log_file${NC}"
      fi
    }
    
    # Display errors for each failed suite (and append to persistent log)
    for suite in $FAILED_SUITES; do
      case $suite in
        backend)
          display_errors "Backend (Jest)" "$ERROR_LOG_DIR/backend.log" 100 "$TEST_LOG_FILE"
          ;;
        web-unit)
          display_errors "Web Unit (Vitest)" "$ERROR_LOG_DIR/web-unit.log" 100 "$TEST_LOG_FILE"
          ;;
        web-e2e)
          display_errors "Web E2E (Playwright)" "$ERROR_LOG_DIR/web-e2e.log" 100 "$TEST_LOG_FILE"
          ;;
        blockchain)
          display_errors "Blockchain (Truffle)" "$ERROR_LOG_DIR/blockchain.log" 100 "$TEST_LOG_FILE"
          ;;
      esac
    done
    
    echo ""
    echo -e "${CYAN}======================================${NC}"
    echo -e "${YELLOW}💡 Errors saved to: $TEST_LOG_FILE${NC}"
    echo -e "${YELLOW}   (Overwritten each run)${NC}"
    echo -e "${CYAN}======================================${NC}"
    
    # Add overall summary to persistent log
    {
      echo ""
      echo "========================================"
      echo "OVERALL SUMMARY"
      echo "========================================"
      echo "Suites passed: $TOTAL_PASSED"
      echo "Suites failed: $TOTAL_FAILED"
      echo "Failed: $FAILED_SUITES"
      echo "Run completed at $(date)"
    } >> "$TEST_LOG_FILE"
    exit 1
  else
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    {
      echo ""
      echo "========================================"
      echo "OVERALL SUMMARY"
      echo "========================================"
      echo "All $TOTAL_PASSED suite(s) passed!"
      echo "Run completed at $(date)"
    } >> "$TEST_LOG_FILE"
    exit 0
  fi
}

# If --test flag, run all tests and exit
if [ "$TEST_MODE" = true ]; then
  run_all_tests
fi

# ================================
# Email configuration check (skip with --skip-email-check)
# ================================
if [ "$SKIP_EMAIL_CHECK" = false ]; then
  PROJECT_ROOT_EMAIL="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
  if [ -f "${PROJECT_ROOT_EMAIL}/backend/check-email-config.js" ]; then
    echo ""
    echo -e "${CYAN}📧 Checking email configuration (Resend/SendGrid/etc.)...${NC}"
    echo -e "${CYAN}   Run with --skip-email-check to skip this.${NC}"
    echo ""
    if ! (cd "${PROJECT_ROOT_EMAIL}" && node backend/check-email-config.js 2>/dev/null); then
      echo ""
      echo -e "${YELLOW}⚠️  Email configuration check failed or dotenv not installed yet.${NC}"
      echo -e "${CYAN}   This is OK for first run - the app will use mock emails in dev mode.${NC}"
      echo -e "${CYAN}   To verify real emails later: npm install && ./start.sh${NC}"
      echo ""
      # Don't exit - continue with startup for "just works" experience
    fi
    echo ""
  fi
fi

# ================================
# Production mode: full reset (containers + volumes → empty DB)
# ================================
# Build compose file list (base + optional no-ipfs + optional atlas + optional dev/prod)
COMPOSE_FILES="-f docker-compose.yml"
if [ "$SKIP_IPFS" = true ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.no-ipfs.yml"
fi
if [ "$ATLAS_MODE" = true ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.atlas.yml"
fi
if [ "$GANACHE_GUI" = true ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.ganache-gui.yml"
fi

if [ "$ATLAS_MODE" = true ]; then
  echo ""
  if ! prepare_atlas_mongo_uri; then
    echo ""
    echo -e "${RED}Atlas preflight failed. Startup aborted.${NC}"
    exit 1
  fi
fi

if [ "$PRODUCTION_MODE" = true ]; then
  echo ""
  echo -e "${CYAN}🏭 Production mode: resetting everything (containers + volumes)...${NC}"
  echo -e "${YELLOW}   This will remove all containers and volumes (MongoDB, IPFS, etc.). DB will be empty.${NC}"
  docker-compose $COMPOSE_FILES down -v 2>/dev/null || docker-compose down -v 2>/dev/null
  echo -e "${GREEN}   ✅ Containers and volumes removed.${NC}"
  echo ""
  sleep 2
else
  # Check if services are already running (only when not production)
  RUNNING_COUNT=$(check_running_services)
  if [ "$RUNNING_COUNT" -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Capstone services are already running!${NC}"
    echo -e "${CYAN}   Found $RUNNING_COUNT container(s):${NC}"
    docker ps --filter "name=capstone-" --format "      • {{.Names}}" 2>/dev/null
    echo ""
    read -p "Do you want to restart them? [y/N]: " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo -e "${GREEN}   Keeping existing services. Use ./stop.sh to stop them.${NC}"
      exit 0
    fi
    echo -e "${CYAN}   Stopping existing services first...${NC}"
    docker-compose $COMPOSE_FILES down 2>/dev/null || docker-compose down 2>/dev/null
    sleep 2
  fi
fi

# Clean Docker resources if requested
if [ "$CLEAN_DOCKER" = true ]; then
  echo ""
  echo -e "${CYAN}🧹 Cleaning up Docker resources...${NC}"

  # Show current disk usage
  DISK_USED=$(df -h / 2>/dev/null | awk 'NR==2{print $3}')
  DISK_AVAIL=$(df -h / 2>/dev/null | awk 'NR==2{print $4}')
  DISK_PCT=$(df -h / 2>/dev/null | awk 'NR==2{print $5}')
  echo -e "${CYAN}   Disk: ${DISK_USED} used, ${DISK_AVAIL} free (${DISK_PCT})${NC}"
  echo -e "${CYAN}   Docker:${NC}"
  docker system df 2>/dev/null | head -5 | tail -4 | sed 's/^/      /'

  # ---- Docker cleanup ----
  echo ""
  echo -e "${YELLOW}   Removing unused Docker resources...${NC}"
  docker system prune -f 2>/dev/null

  # Remove dangling (untagged) images that pile up from rebuilds
  DANGLING=$(docker images -f "dangling=true" -q 2>/dev/null)
  if [ -n "$DANGLING" ]; then
    echo -e "${YELLOW}   Removing dangling Docker images...${NC}"
    docker rmi $DANGLING 2>/dev/null || true
  fi

  # Remove Docker build cache
  echo -e "${YELLOW}   Clearing Docker build cache...${NC}"
  docker builder prune -af 2>/dev/null || true

  # Remove corrupted IPFS volume if it exists (fixes "error loading plugins: EOF")
  if docker volume inspect capstone_ipfs_data >/dev/null 2>&1; then
    echo -e "${YELLOW}   Removing IPFS data volume (fixes plugin corruption)...${NC}"
    docker volume rm capstone_ipfs_data 2>/dev/null || true
  fi

  # ---- System cache cleanup (critical for Codespaces with limited disk) ----
  echo ""
  echo -e "${YELLOW}   Clearing system caches (npm, pip, Playwright)...${NC}"

  # npm cache
  if [ -d "$HOME/.npm" ]; then
    NPM_CACHE_SIZE=$(du -sh "$HOME/.npm" 2>/dev/null | cut -f1)
    echo -e "${YELLOW}   npm cache: ${NPM_CACHE_SIZE}${NC}"
    npm cache clean --force 2>/dev/null || true
  fi

  # pip cache
  if [ -d "$HOME/.cache/pip" ]; then
    PIP_CACHE_SIZE=$(du -sh "$HOME/.cache/pip" 2>/dev/null | cut -f1)
    echo -e "${YELLOW}   pip cache: ${PIP_CACHE_SIZE}${NC}"
    rm -rf "$HOME/.cache/pip" 2>/dev/null || true
  fi

  # Playwright browsers (huge — 500MB+, reinstalls on next test run)
  PW_CACHE="$HOME/.cache/ms-playwright"
  if [ -d "$PW_CACHE" ]; then
    PW_SIZE=$(du -sh "$PW_CACHE" 2>/dev/null | cut -f1)
    echo -e "${YELLOW}   Playwright browsers: ${PW_SIZE} (will reinstall on next test run)${NC}"
    rm -rf "$PW_CACHE" 2>/dev/null || true
  fi

  # ---- Rebuild backend services ----
  echo ""
  echo -e "${YELLOW}   Rebuilding backend services (ensures package.json deps are installed)...${NC}"
  if [ "$DEV_MODE" = true ]; then
    docker-compose $COMPOSE_FILES -f docker-compose.dev.yml build --no-cache auth-service business-service admin-service audit-service lob-model 2>/dev/null || true
  else
    docker-compose $COMPOSE_FILES build --no-cache auth-service business-service admin-service audit-service lob-model 2>/dev/null || true
  fi

  echo ""
  echo -e "${GREEN}   ✅ Cleanup complete!${NC}"
  DISK_AVAIL_NEW=$(df -h / 2>/dev/null | awk 'NR==2{print $4}')
  DISK_PCT_NEW=$(df -h / 2>/dev/null | awk 'NR==2{print $5}')
  echo -e "${CYAN}   Disk now: ${DISK_AVAIL_NEW} free (${DISK_PCT_NEW})${NC}"
  echo -e "${CYAN}   Docker:${NC}"
  docker system df 2>/dev/null | head -5 | tail -4 | sed 's/^/      /'
  echo ""
fi

# ================================
# Rebuild Docker Images if Requested
# ================================
if [ "$REBUILD_IMAGES" = true ]; then
  echo ""
  echo -e "${CYAN}🔨 Rebuilding Docker images...${NC}"
  echo -e "${YELLOW}   This ensures all dependencies are properly installed${NC}"
  if [ "$DEV_MODE" = true ]; then
    docker-compose $COMPOSE_FILES -f docker-compose.dev.yml build --no-cache
  else
    docker-compose $COMPOSE_FILES build --no-cache
  fi
  echo -e "${GREEN}   ✅ Rebuild complete!${NC}"
  echo ""
fi

# ================================
# Start Docker Services
# ================================
if [ "$GANACHE_GUI" = true ]; then
  echo ""
  echo -e "${CYAN}🖥️  Ganache GUI mode: using your desktop Ganache on port 7545${NC}"
  echo -e "${YELLOW}   1. Open Ganache GUI and click Quick Start (or use a workspace on port 7545)${NC}"
  echo -e "${YELLOW}   2. Copy Account 0's private key: in Ganache click the key icon next to the first account → paste it into .env as DEPLOYER_PRIVATE_KEY${NC}"
  echo -e "${YELLOW}   3. Ensure no other process is using port 7545 (e.g. ./stop.sh first)${NC}"
  echo ""
  # Optional: wait for port 7545 to be open (Ganache GUI)
  if command -v nc >/dev/null 2>&1; then
    if ! nc -z 127.0.0.1 7545 2>/dev/null; then
      echo -e "${YELLOW}   ⏳ Waiting for Ganache on port 7545 (start the GUI if you haven't)...${NC}"
      for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
        if nc -z 127.0.0.1 7545 2>/dev/null; then
          echo -e "${GREEN}   ✅ Ganache detected on 7545${NC}"
          break
        fi
        sleep 1
      done
      if ! nc -z 127.0.0.1 7545 2>/dev/null; then
        echo -e "${RED}   ❌ Ganache not detected on port 7545. Start Ganache GUI and run ./start.sh --ganache-gui again.${NC}"
        exit 1
      fi
    fi
    # Deploy contracts, update .env, grant roles (run every time so addresses always match this chain)
    ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
    if [ -d "$ROOT/blockchain" ] && [ -f "$ROOT/blockchain/package.json" ]; then
      echo -e "${CYAN}   Deploying contracts and granting roles for audit logging...${NC}"
      (cd "$ROOT/blockchain" && npm run setup) || true
    fi
  else
    ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
    if [ -d "$ROOT/blockchain" ] && [ -f "$ROOT/blockchain/package.json" ]; then
      echo -e "${CYAN}   Deploying contracts and granting roles for audit logging...${NC}"
      (cd "$ROOT/blockchain" && npm run setup) || true
    fi
  fi
  echo ""
fi
if [ "$RETRAIN_LOB" = true ]; then
  export LOB_RETRAIN_ON_START=1
  echo -e "${CYAN}   LOB model will retrain from dataset on startup (--retrain).${NC}"
fi
echo ""
if [ "$ATLAS_MODE" = true ]; then
  echo -e "${CYAN}   Using MongoDB Atlas (MONGO_URI from .env). Local MongoDB container will not start.${NC}"
fi
if [ "$DEV_MODE" = true ]; then
  echo -e "${CYAN}🚀 Starting in DEVELOPMENT mode (auto-reload enabled)...${NC}"
  if [ "$SKIP_IPFS" = true ]; then
    echo -e "${YELLOW}   Skipping IPFS (file uploads will use local storage fallback)${NC}"
  fi
  docker-compose $COMPOSE_FILES -f docker-compose.dev.yml up -d
elif [ "$DEMO_MODE" = true ]; then
  echo -e "${CYAN}🚀 Starting in DEMO mode (production build, no dev UI)...${NC}"
  echo -e "${CYAN}   Rebuilding backend services to ensure latest code...${NC}"
  if [ "$SKIP_IPFS" = true ]; then
    echo -e "${YELLOW}   Skipping IPFS (file uploads will use local storage fallback)${NC}"
  fi
  docker-compose $COMPOSE_FILES -f docker-compose.prod.yml up -d --build --force-recreate
else
  if [ "$PRODUCTION_MODE" = true ]; then
    echo -e "${CYAN}🚀 Starting in PRODUCTION mode (fresh DB)...${NC}"
  else
    echo -e "${CYAN}🚀 Starting Docker services...${NC}"
  fi
  if [ "$SKIP_IPFS" = true ]; then
    echo -e "${YELLOW}   Skipping IPFS (file uploads will use local storage fallback)${NC}"
  fi
  docker-compose $COMPOSE_FILES up -d
fi

echo ""
if [ "$SLOW_NETWORK" = true ]; then
  echo -e "${CYAN}⏳ Waiting for services to initialize (slow network: ${WAIT_AFTER_DOCKER}s)...${NC}"
else
  echo -e "${CYAN}⏳ Waiting for services to initialize...${NC}"
fi
sleep $WAIT_AFTER_DOCKER

# Check if blockchain audit logging will work; if not, run setup automatically
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
if [ -f "$ROOT/blockchain/check-blockchain-ready.js" ]; then
  if ! (cd "$ROOT/blockchain" && node check-blockchain-ready.js); then
    echo -e "${CYAN}   Setting up blockchain (deploy contracts + grant roles)...${NC}"
    (cd "$ROOT/blockchain" && npm run setup) || true
    if ! (cd "$ROOT/blockchain" && node check-blockchain-ready.js); then
      echo -e "${YELLOW}   Fix: cd blockchain && npm run setup${NC}"
      echo ""
    fi
  fi
fi

echo ""
echo -e "${CYAN}🌐 Starting web frontend...${NC}"

# Check if web directory exists
if [ -d "web" ]; then
  cd web
  
  # Validate environment configuration
  echo -e "${CYAN}   Validating web environment configuration...${NC}"
  if [ -f .env ]; then
    # Check for microservices vs unified backend mismatch
    if grep -q "VITE_BACKEND_ORIGIN=http://localhost:3000" .env && \
       ! grep -q "VITE_USE_MICROSERVICES=false" .env; then
      echo -e "${YELLOW}   ⚠️  WARNING: web/.env points to unified backend (3000) but microservices mode is default${NC}"
      echo -e "${YELLOW}   💡 Consider adding: VITE_USE_MICROSERVICES=true to web/.env${NC}"
    fi
    
    # Check if microservices mode is properly configured
    if grep -q "VITE_USE_MICROSERVICES=true" .env; then
      echo -e "${GREEN}   ✅ Microservices mode configured in web/.env${NC}"
    elif ! grep -q "VITE_USE_MICROSERVICES" .env; then
      echo -e "${CYAN}   ℹ️  Using default microservices mode (VITE_USE_MICROSERVICES not set)${NC}"
    fi
  else
    echo -e "${YELLOW}   ⚠️  web/.env not found, using default configuration${NC}"
  fi
  
  # Always run npm install to ensure package.json and node_modules stay in sync
  # (catches new deps from git pull, fresh clones, or corrupted node_modules)
  echo -e "${CYAN}   Ensuring web dependencies are installed...${NC}"
  npm install
  
  if [ "$DEMO_MODE" = true ]; then
    # Demo mode: build and serve with Vite preview (port 4173), no dev server.
    # Vite bakes env vars in at build time; ensure VITE_BACKEND_ORIGIN is set so production API routing works.
    if [ -f .env ]; then set -a; . ./.env; set +a; fi
    export VITE_BACKEND_ORIGIN="${VITE_BACKEND_ORIGIN:-http://localhost:3001}"
    echo -e "${GREEN}   Building web app for demo (production)...${NC}"
    if npm run build 2>&1; then
      echo -e "${GREEN}   ✅ Build complete. Starting preview server on port 4173...${NC}"
      (npm run preview > /tmp/web-preview-server.log 2>&1) &
      WEB_PID=$!
      echo $WEB_PID > /tmp/web-preview-server.pid
      sleep $WAIT_AFTER_WEB
      if ps -p $WEB_PID > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ Preview server started (PID: $WEB_PID)${NC}"
        echo -e "${CYAN}   App: http://localhost:4173${NC}"
      else
        echo -e "${YELLOW}   ⚠️  Preview may have failed. Check: tail /tmp/web-preview-server.log${NC}"
      fi
    else
      echo -e "${RED}   ❌ Build failed. Check output above.${NC}"
    fi
  else
    # Write or clear VITE_DEMO_UI in .env.local so Vite exposes it to the client
    if [ "$DEMO_UI_MODE" = true ]; then
      grep -q '^VITE_DEMO_UI=' .env.local 2>/dev/null && sed -i 's/^VITE_DEMO_UI=.*/VITE_DEMO_UI=true/' .env.local || echo 'VITE_DEMO_UI=true' >> .env.local
    else
      sed -i '/^VITE_DEMO_UI=/d' .env.local 2>/dev/null || true
    fi

    # In demo-ui mode, restart if already running so the new .env.local takes effect
    if [ "$DEMO_UI_MODE" = true ]; then
      if pgrep -f "vite.*5173" > /dev/null; then
        echo -e "${CYAN}   Restarting web dev server with demo UI (no FAB/prefill)...${NC}"
        pkill -f "vite.*5173" 2>/dev/null || true
        sleep 1
      fi
    fi
    
    # Always restart Vite dev server so startup is deterministic
    echo -e "${CYAN}   Restarting web dev server on port 5173...${NC}"

    # Stop PID tracked by prior runs first
    if [ -f /tmp/web-dev-server.pid ]; then
      OLD_WEB_PID=$(cat /tmp/web-dev-server.pid 2>/dev/null)
      if [ -n "$OLD_WEB_PID" ] && kill -0 "$OLD_WEB_PID" >/dev/null 2>&1; then
        kill "$OLD_WEB_PID" >/dev/null 2>&1 || true
        sleep 1
      fi
      rm -f /tmp/web-dev-server.pid
    fi

    # Stop anything still bound to 5173 (preferred)
    if command -v lsof >/dev/null 2>&1; then
      WEB_PORT_PIDS=$(lsof -ti tcp:5173 2>/dev/null | sort -u)
      if [ -n "$WEB_PORT_PIDS" ]; then
        kill $WEB_PORT_PIDS >/dev/null 2>&1 || true
        sleep 1
        WEB_PORT_PIDS_REMAINING=$(lsof -ti tcp:5173 2>/dev/null | sort -u)
        if [ -n "$WEB_PORT_PIDS_REMAINING" ]; then
          kill -9 $WEB_PORT_PIDS_REMAINING >/dev/null 2>&1 || true
          sleep 1
        fi
      fi
    fi

    # Fallback process-name kill for environments where lsof is unavailable
    pkill -f "vite.*5173" 2>/dev/null || true

    # Check if web dependencies need installation (already in web directory)
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
      echo -e "${YELLOW}   Installing web dependencies...${NC}"
      npm install
    fi

    if [ "$DEMO_UI_MODE" = true ]; then
      echo -e "${GREEN}   Starting web dev server on port 5173 (demo UI: no FAB/prefill)...${NC}"
    else
      echo -e "${GREEN}   Starting web dev server on port 5173...${NC}"
    fi
    (npm run dev > /tmp/web-dev-server.log 2>&1) &
    WEB_PID=$!
    echo $WEB_PID > /tmp/web-dev-server.pid
    sleep $WAIT_AFTER_WEB
    if ps -p $WEB_PID > /dev/null 2>&1; then
      echo -e "${GREEN}   ✅ Web server started (PID: $WEB_PID)${NC}"
      echo -e "${CYAN}   Logs: tail -f /tmp/web-dev-server.log${NC}"
    else
      echo -e "${YELLOW}   ⚠️  Web server may have failed to start. Check logs: tail /tmp/web-dev-server.log${NC}"
    fi
  fi
  
  cd ..
else
  echo -e "${YELLOW}   ⚠️  Web directory not found, skipping web frontend${NC}"
fi

echo ""
echo -e "${CYAN}⏳ Waiting a bit more for everything to be ready...${NC}"
sleep $WAIT_BEFORE_BROWSER

# ================================
# Auto-detect or start ngrok tunnel
# ================================
NGROK_URL=""
USE_NGROK=false

# Check if ngrok is already running
if pgrep -f "ngrok" > /dev/null 2>&1; then
  echo -e "${CYAN}🌐 ngrok is already running, detecting URL...${NC}"
  # Try to get URL from ngrok API - support both .ngrok-free.dev and .ngrok.app
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o "https://[a-zA-Z0-9.-]*\.\(ngrok-free\.dev\|ngrok\.app\)" | head -n 1)
  if [ -n "$NGROK_URL" ]; then
    echo -e "${GREEN}   ✅ Detected ngrok URL: $NGROK_URL${NC}"
    USE_NGROK=1
  fi
fi

# Start ngrok if --ngrok flag is used or if not detected but we want to start it
if [ "$NGROK_MODE" = true ] && [ "$USE_NGROK" = false ]; then
  echo ""
  echo -e "${CYAN}🌐 Starting ngrok tunnel for HTTPS/WebAuthn access...${NC}"
  
  # Check if ngrok is installed
  if ! command -v ngrok >/dev/null 2>&1; then
    echo -e "${RED}   ❌ ngrok not found. Install it from https://ngrok.com/download${NC}"
    echo -e "${YELLOW}   💡 Or remove --ngrok flag to use localhost${NC}"
    exit 1
  fi
  
  # Retry ngrok startup up to 3 times for unstable connections
  NGROK_ATTEMPT=1
  MAX_NGROK_ATTEMPTS=3
  while [ $NGROK_ATTEMPT -le $MAX_NGROK_ATTEMPTS ]; do
    # Kill any existing ngrok processes
    pkill -f "ngrok" 2>/dev/null || true
    sleep 1
    
    # Start ngrok in background with nohup to prevent SIGHUP
    echo -e "${CYAN}   Starting ngrok on port 5173 (attempt $NGROK_ATTEMPT/$MAX_NGROK_ATTEMPTS)...${NC}"
    nohup ngrok http 5173 > /tmp/ngrok.log 2>&1 &
    NGROK_PID=$!
    echo $NGROK_PID > /tmp/ngrok.pid
    
    # Wait for ngrok to start and get the URL
    echo -e "${CYAN}   Waiting for ngrok to start...${NC}"
    sleep 15
    
    # Extract ngrok URL from log
    for i in {1..10}; do
      NGROK_URL=$(grep -o "https://[a-zA-Z0-9.-]*\.\(ngrok-free\.dev\|ngrok\.app\)" /tmp/ngrok.log 2>/dev/null | head -n 1)
      if [ -n "$NGROK_URL" ]; then
        break
      fi
      sleep 1
    done

    # Fallback: try ngrok API if log grep failed (with retries)
    if [ -z "$NGROK_URL" ]; then
      echo -e "${CYAN}   Log grep failed, trying ngrok API...${NC}"
      for api_attempt in {1..5}; do
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o "https://[a-zA-Z0-9.-]*\.\(ngrok-free\.dev\|ngrok\.app\)" | head -n 1)
        if [ -n "$NGROK_URL" ]; then
          echo -e "${GREEN}   ✅ Got URL from API: $NGROK_URL${NC}"
          break
        fi
        if [ $api_attempt -lt 5 ]; then
          echo -e "${CYAN}   API not ready yet, retrying in 2s...${NC}"
          sleep 2
        fi
      done
    fi
    
    if [ -n "$NGROK_URL" ]; then
      # Success - break out of retry loop
      USE_NGROK=1
      break
    else
      # Failed - retry if not at max attempts
      if [ $NGROK_ATTEMPT -lt $MAX_NGROK_ATTEMPTS ]; then
        echo -e "${YELLOW}   ⚠️  Failed to get ngrok URL (attempt $NGROK_ATTEMPT/$MAX_NGROK_ATTEMPTS). Retrying...${NC}"
        NGROK_ATTEMPT=$((NGROK_ATTEMPT + 1))
        sleep 2
      else
        # Max attempts reached - give up and use localhost
        echo -e "${RED}   ❌ Failed to start ngrok after $MAX_NGROK_ATTEMPTS attempts.${NC}"
        echo -e "${YELLOW}   💡 Check ngrok logs: tail /tmp/ngrok.log${NC}"
        echo -e "${YELLOW}   💡 ngrok log content:${NC}"
        cat /tmp/ngrok.log 2>/dev/null || echo "   (log file empty or missing)"
        echo -e "${YELLOW}   💡 You may need to: 1) Check your ngrok account status, 2) Restart ngrok, or 3) Remove --ngrok flag${NC}"
        echo -e "${CYAN}   ⏭️  Continuing with localhost...${NC}"
        USE_NGROK=false
        NGROK_URL=""
        # Kill any lingering ngrok processes
        pkill -f "ngrok" 2>/dev/null || true
        rm -f /tmp/ngrok.pid
        break
      fi
    fi
  done
  
  if [ "$USE_NGROK" = 1 ] && [ -n "$NGROK_URL" ]; then
    echo -e "${GREEN}   ✅ ngrok tunnel started: $NGROK_URL${NC}"
  fi
fi

# Update web/.env and root .env based on detected/started ngrok or localhost
if [ "$USE_NGROK" = 1 ] && [ -n "$NGROK_URL" ]; then
  # Extract domain from ngrok URL (remove https://)
  NGROK_DOMAIN=$(echo "$NGROK_URL" | sed 's|https://||')
  
  # Update web/.env
  if [ -f "web/.env" ]; then
    # Update or add VITE_WEBAUTHN_ORIGIN (macOS sed compatibility: use -i '')
    if grep -q "^VITE_WEBAUTHN_ORIGIN=" web/.env; then
      sed -i '' "s|^VITE_WEBAUTHN_ORIGIN=.*|VITE_WEBAUTHN_ORIGIN=$NGROK_URL|" web/.env
    else
      echo "VITE_WEBAUTHN_ORIGIN=$NGROK_URL" >> web/.env
    fi
    echo -e "${GREEN}   ✅ Updated web/.env with ngrok URL${NC}"
  fi
  
  # Update root .env for backend WebAuthn
  if [ -f ".env" ]; then
    # Update or add WEBAUTHN_RPID
    if grep -q "^WEBAUTHN_RPID=" .env; then
      sed -i '' "s|^WEBAUTHN_RPID=.*|WEBAUTHN_RPID=$NGROK_DOMAIN|" .env
    else
      echo "WEBAUTHN_RPID=$NGROK_DOMAIN" >> .env
    fi
    # Update or add WEBAUTHN_ORIGIN
    if grep -q "^WEBAUTHN_ORIGIN=" .env; then
      sed -i '' "s|^WEBAUTHN_ORIGIN=.*|WEBAUTHN_ORIGIN=$NGROK_URL|" .env
    else
      echo "WEBAUTHN_ORIGIN=$NGROK_URL" >> .env
    fi
    echo -e "${GREEN}   ✅ Updated root .env with ngrok WebAuthn config${NC}"
  fi
  
  export NGROK_URL="$NGROK_URL"
  export USE_NGROK=1
else
  # Use localhost
  if [ -f "web/.env" ]; then
    if grep -q "^VITE_WEBAUTHN_ORIGIN=" web/.env; then
      sed -i '' "s|^VITE_WEBAUTHN_ORIGIN=.*|VITE_WEBAUTHN_ORIGIN=http://localhost:5173|" web/.env
    else
      echo "VITE_WEBAUTHN_ORIGIN=http://localhost:5173" >> web/.env
    fi
    if grep -q "^VITE_WEBAUTHN_RPID=" web/.env; then
      sed -i '' "s|^VITE_WEBAUTHN_RPID=.*|VITE_WEBAUTHN_RPID=localhost|" web/.env
    else
      echo "VITE_WEBAUTHN_RPID=localhost" >> web/.env
    fi
    echo -e "${GREEN}   ✅ Updated web/.env with localhost${NC}"
  fi

  # Also update web/.env.local (overrides web/.env)
  if [ -f "web/.env.local" ]; then
    if grep -q "^VITE_WEBAUTHN_ORIGIN=" web/.env.local; then
      sed -i '' "s|^VITE_WEBAUTHN_ORIGIN=.*|VITE_WEBAUTHN_ORIGIN=http://localhost:5173|" web/.env.local
    else
      echo "VITE_WEBAUTHN_ORIGIN=http://localhost:5173" >> web/.env.local
    fi
    if grep -q "^VITE_WEBAUTHN_RPID=" web/.env.local; then
      sed -i '' "s|^VITE_WEBAUTHN_RPID=.*|VITE_WEBAUTHN_RPID=localhost|" web/.env.local
    else
      echo "VITE_WEBAUTHN_RPID=localhost" >> web/.env.local
    fi
    echo -e "${GREEN}   ✅ Updated web/.env.local with localhost${NC}"
  fi

  # Update root .env for backend WebAuthn
  if [ -f ".env" ]; then
    # Update or add WEBAUTHN_RPID
    if grep -q "^WEBAUTHN_RPID=" .env; then
      sed -i '' "s|^WEBAUTHN_RPID=.*|WEBAUTHN_RPID=localhost|" .env
    else
      echo "WEBAUTHN_RPID=localhost" >> .env
    fi
    # Update or add WEBAUTHN_ORIGIN
    if grep -q "^WEBAUTHN_ORIGIN=" .env; then
      sed -i '' "s|^WEBAUTHN_ORIGIN=.*|WEBAUTHN_ORIGIN=http://localhost:5173|" .env
    else
      echo "WEBAUTHN_ORIGIN=http://localhost:5173" >> .env
    fi
    echo -e "${GREEN}   ✅ Updated root .env with localhost WebAuthn config${NC}"
  fi

  export USE_NGROK=false
fi

echo ""
echo -e "${CYAN}🌐 Opening browser tabs...${NC}"
if [ "$DEMO_MODE" = true ]; then
  export WEB_APP_PORT=4173
fi
if [ "$OPEN_WEB_ONLY" = true ]; then
  export OPEN_WEB_ONLY=1
  export USE_NGROK="$USE_NGROK"
  export NGROK_URL="$NGROK_URL"
  ./scripts/open-services.sh --web-only
elif [ "$GANACHE_GUI" = true ]; then
  GANACHE_GUI=1 USE_NGROK="$USE_NGROK" NGROK_URL="$NGROK_URL" ./scripts/open-services.sh
elif [ "$SKIP_IPFS" = true ] && [ "$ATLAS_MODE" = true ]; then
  SKIP_IPFS=1 ATLAS_MODE=1 USE_NGROK="$USE_NGROK" NGROK_URL="$NGROK_URL" ./scripts/open-services.sh
elif [ "$SKIP_IPFS" = true ]; then
  SKIP_IPFS=1 USE_NGROK="$USE_NGROK" NGROK_URL="$NGROK_URL" ./scripts/open-services.sh
elif [ "$ATLAS_MODE" = true ]; then
  ATLAS_MODE=1 USE_NGROK="$USE_NGROK" NGROK_URL="$NGROK_URL" ./scripts/open-services.sh
else
  USE_NGROK="$USE_NGROK" NGROK_URL="$NGROK_URL" ./scripts/open-services.sh
fi

echo ""
echo -e "${GREEN}✅ All done! Your services are running and browser tabs are open.${NC}"
echo ""
if [ "$DEV_MODE" = true ]; then
  echo -e "${CYAN}🔥 Development Mode: Auto-reload enabled!${NC}"
  echo -e "${CYAN}   • Backend services will restart automatically on file changes${NC}"
  echo -e "${CYAN}   • Frontend has hot module replacement (HMR) - changes appear instantly${NC}"
  echo ""
fi
if [ "$DEMO_MODE" = true ]; then
  echo -e "${CYAN}🎭 Demo Mode (4173): Production build, no FAB/prefill. Same backend APIs (auth 3001, etc.). Use seeded accounts (e.g. bizclear-admin@mailinator.com + TempPass123!).${NC}"
  echo -e "${CYAN}   📧 To receive real verification emails: set EMAIL_API_KEY in .env (e.g. Resend).${NC}"
  echo ""
fi
if [ "$DEMO_UI_MODE" = true ]; then
  echo -e "${CYAN}🎭 Demo UI (5173): Dev server with clean UI (no FAB/prefill). Hot reload enabled, same backend APIs.${NC}"
  echo -e "${CYAN}   📧 To receive real verification emails: set EMAIL_API_KEY in .env (e.g. Resend).${NC}"
  echo ""
fi
if [ "$GANACHE_GUI" = true ]; then
  echo -e "${CYAN}🖥️  Ganache GUI: Blockchain runs in your desktop Ganache. Open the GUI to see transactions and gas.${NC}"
  echo ""
fi
echo -e "${CYAN}Running services:${NC}"
echo -e "   • Docker services (MongoDB, IPFS, APIs)"
if [ -f "/tmp/web-preview-server.pid" ]; then
  echo -e "   • Web frontend (http://localhost:4173) - production build (API: 3001–3004)"
elif [ -f "/tmp/web-dev-server.pid" ]; then
  if [ "$DEMO_UI_MODE" = true ]; then
    echo -e "   • Web frontend (http://localhost:5173) - demo UI, HMR (API: 3001–3004)"
  else
    echo -e "   • Web frontend (http://localhost:5173) - HMR enabled"
  fi
fi
WEB_PORT=""
if [ -f "/tmp/web-preview-server.pid" ]; then
  WEB_PORT="4173"
elif [ -f "/tmp/web-dev-server.pid" ]; then
  WEB_PORT="5173"
fi

if [ -n "$WEB_PORT" ]; then
  echo ""
  print_lan_web_urls "$WEB_PORT"
fi

# Show ngrok URL if active
if [ "$USE_NGROK" = 1 ] && [ -n "$NGROK_URL" ]; then
  echo ""
  echo -e "${CYAN}🌐 Ngrok tunnel (HTTPS/WebAuthn):${NC}"
  echo -e "   • $NGROK_URL"
fi
echo ""
echo -e "${CYAN}To stop:${NC}"
echo -e "   • Docker: ./stop.sh"
if [ -f "/tmp/web-preview-server.pid" ]; then
  echo -e "   • Web: kill \$(cat /tmp/web-preview-server.pid) or pkill -f 'vite preview'"
elif [ -f "/tmp/web-dev-server.pid" ]; then
  echo -e "   • Web: kill \$(cat /tmp/web-dev-server.pid) or pkill -f vite"
fi
echo ""
echo -e "${CYAN}To view logs:${NC}"
echo -e "   • Dozzle (live in browser): http://localhost:9999"
if [ "$DEV_MODE" = true ] || [ "$DEMO_UI_MODE" = true ]; then
  echo -e "   • Docker (terminal): docker-compose $COMPOSE_FILES -f docker-compose.dev.yml logs -f"
elif [ "$DEMO_MODE" = true ]; then
  echo -e "   • Docker (terminal): docker-compose $COMPOSE_FILES -f docker-compose.prod.yml logs -f"
else
  echo -e "   • Docker (terminal): docker-compose $COMPOSE_FILES logs -f"
fi
if [ -f "/tmp/web-preview-server.pid" ]; then
  echo -e "   • Web: tail -f /tmp/web-preview-server.log"
elif [ -f "/tmp/web-dev-server.pid" ]; then
  echo -e "   • Web: tail -f /tmp/web-dev-server.log"
fi
echo ""
echo -e "${CYAN}💡 Options:${NC}"
echo -e "   • ./start.sh             # Default: dev mode + web-only (current)"
echo -e "   • ./start.sh --no-dev    # Disable dev mode (no auto-reload)"
echo -e "   • ./start.sh --all-tabs  # Open all browser tabs (IPFS, Dozzle, etc.)"
echo -e "   • ./start.sh --demo      # Security demo (4173, production build)"
echo -e "   • ./start.sh --demo-ui   # Demo UI on 5173 (hot reload, no FAB/prefill)"
echo -e "   • ./start.sh --production # Full reset + empty DB"
echo -e "   • ./start.sh --status    # Check what's running and disk usage"
echo -e "   • ./start.sh --clean     # Clean unused Docker resources"
echo -e "   • ./start.sh --rebuild   # Rebuild Docker images (fixes deps)"
echo -e "   • ./start.sh --skip-ipfs # Skip IPFS container"
echo -e "   • ./start.sh --atlas     # Use MongoDB Atlas (set MONGO_URI in .env)"
echo -e "   • ./start.sh --retrain   # Retrain LOB AI model on startup"
echo -e "   • ./start.sh --eval-lob  # Evaluate LOB model accuracy"
echo -e "   • ./start.sh --test      # Run all tests (backend, web, blockchain)"
echo -e "   • ./start.sh --ganache-gui  # Use Ganache GUI on 7545"
echo -e "   • ./start.sh --iphone    # Run mobile app on iOS simulator"
echo -e "   • ./start.sh --android   # Run mobile app on Android"
echo -e "   • ./start.sh --skip-email-check  # Skip email config check"