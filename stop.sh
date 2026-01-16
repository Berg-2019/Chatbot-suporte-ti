#!/bin/bash
# =============================================================================
# Helpdesk - Script de Parada
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║   🎫 HELPDESK - Parando serviços...                           ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

MODE="${1:-prod}"

case "$MODE" in
    prod|production)
        echo -e "${YELLOW}🛑 Parando containers de produção...${NC}"
        docker-compose -f docker-compose.prod.yml down
        ;;
    full)
        echo -e "${YELLOW}🛑 Parando todos os containers...${NC}"
        docker-compose down
        ;;
    *)
        echo "Uso: $0 [prod|full]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Serviços parados!${NC}"
echo ""
