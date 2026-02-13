#!/bin/bash
# ┌─────────────────────────────────────────────────┐
# │  oh-my-ag — Script de Uso Rápido                │
# │  Projeto: Chatbot Suporte TI                    │
# │  Multi-Agent Orchestrator for Antigravity        │
# └─────────────────────────────────────────────────┘

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Banner
show_banner() {
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "  ╔═══════════════════════════════════════════╗"
    echo "  ║   🛸  oh-my-ag — Multi-Agent Framework    ║"
    echo "  ║   📂  Chatbot Suporte TI                  ║"
    echo "  ╚═══════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "  ${YELLOW}Mapeamento de AI otimizado:${NC}"
    echo -e "  ${GREEN}Gemini${NC}  → Frontend, PM (free, rápido)"
    echo -e "  ${BLUE}Codex${NC}   → Backend (APIs/DB)"
    echo -e "  ${MAGENTA}Claude${NC}  → QA, Debug (análise profunda)"
    echo -e "  ${CYAN}Qwen${NC}    → Mobile (econômico)"
    echo ""
}

# Menu principal
show_menu() {
    echo -e "${BOLD}═══ Menu Principal ════════════════════════${NC}"
    echo ""
    echo -e "  ${GREEN}1)${NC}  🩺 Doctor         — Verificar saúde do sistema"
    echo -e "  ${GREEN}2)${NC}  📊 Dashboard TUI  — Monitor em tempo real (terminal)"
    echo -e "  ${GREEN}3)${NC}  🌐 Dashboard Web  — Monitor em tempo real (browser)"
    echo -e "  ${GREEN}4)${NC}  📈 Stats          — Métricas de produtividade"
    echo -e "  ${GREEN}5)${NC}  📝 Retro          — Retrospectiva da sessão"
    echo -e "  ${GREEN}6)${NC}  🔄 Update         — Atualizar skills"
    echo -e "  ${GREEN}7)${NC}  📡 Usage          — Cotas de uso de modelos"
    echo -e "  ${GREEN}8)${NC}  🧹 Cleanup        — Limpar processos órfãos"
    echo ""
    echo -e "${BOLD}═══ Agentes ═══════════════════════════════${NC}"
    echo ""
    echo -e "  ${CYAN}10)${NC} 🚀 Spawn Agente   — Iniciar um agente específico"
    echo -e "  ${CYAN}11)${NC} 📋 Status Agente  — Verificar status de agentes"
    echo -e "  ${CYAN}12)${NC} ✅ Verificar      — Verificar output de um agente"
    echo ""
    echo -e "${BOLD}═══ Atalhos Rápidos ═══════════════════════${NC}"
    echo ""
    echo -e "  ${MAGENTA}20)${NC} 🎨 Frontend      — Spawn agente frontend (Gemini)"
    echo -e "  ${MAGENTA}21)${NC} ⚙️  Backend       — Spawn agente backend (Codex)"
    echo -e "  ${MAGENTA}22)${NC} 🔍 QA Review      — Spawn agente QA (Claude)"
    echo -e "  ${MAGENTA}23)${NC} 🐛 Debug          — Spawn agente debug (Claude)"
    echo -e "  ${MAGENTA}24)${NC} 📐 PM Plan        — Spawn agente PM (Gemini)"
    echo ""
    echo -e "  ${RED}0)${NC}  ❌ Sair"
    echo ""
}

# Gerar session ID
gen_session_id() {
    echo "session-$(date +%Y%m%d-%H%M%S)"
}

# Executar comando
run_cmd() {
    echo ""
    echo -e "${YELLOW}▶ Executando: $*${NC}"
    echo ""
    eval "$@"
}

# Spawn de agente
spawn_agent() {
    local agent_type="$1"
    local vendor="$2"
    local session_id

    echo ""
    echo -e "${CYAN}🤖 Spawn: ${BOLD}$agent_type${NC} (CLI: ${GREEN}$vendor${NC})"
    read -rp "  Descreva a tarefa: " task_prompt

    if [ -z "$task_prompt" ]; then
        echo -e "${RED}❌ Tarefa vazia. Cancelado.${NC}"
        return
    fi

    session_id=$(gen_session_id)
    echo -e "  ${YELLOW}Session: $session_id${NC}"
    echo ""

    bunx oh-my-ag agent:spawn "$agent_type" "$task_prompt" "$session_id" --vendor "$vendor" --workspace "$PROJECT_DIR"
}

# Loop principal
main() {
    show_banner

    while true; do
        show_menu
        read -rp "  Escolha uma opção: " choice
        echo ""

        case $choice in
            1)  run_cmd "bunx oh-my-ag doctor" ;;
            2)  run_cmd "bunx oh-my-ag dashboard" ;;
            3)  run_cmd "bunx oh-my-ag dashboard:web" ;;
            4)  run_cmd "bunx oh-my-ag stats" ;;
            5)  run_cmd "bunx oh-my-ag retro" ;;
            6)  run_cmd "bunx oh-my-ag update" ;;
            7)  run_cmd "bunx oh-my-ag usage" ;;
            8)  run_cmd "bunx oh-my-ag cleanup" ;;

            10)
                echo -e "  Agentes: ${GREEN}frontend${NC} | ${GREEN}backend${NC} | ${GREEN}mobile${NC} | ${GREEN}pm${NC} | ${GREEN}qa${NC} | ${GREEN}debug${NC}"
                read -rp "  Tipo do agente: " agent_type
                read -rp "  CLI (gemini/claude/codex/qwen) [auto]: " vendor

                if [ -z "$vendor" ]; then
                    vendor=""
                    echo ""
                    read -rp "  Descreva a tarefa: " task_prompt
                    session_id=$(gen_session_id)
                    bunx oh-my-ag agent:spawn "$agent_type" "$task_prompt" "$session_id" --workspace "$PROJECT_DIR"
                else
                    spawn_agent "$agent_type" "$vendor"
                fi
                ;;

            11)
                read -rp "  Session ID: " sid
                run_cmd "bunx oh-my-ag agent:status \"$sid\""
                ;;

            12)
                echo -e "  Tipos: ${GREEN}frontend${NC} | ${GREEN}backend${NC} | ${GREEN}mobile${NC} | ${GREEN}qa${NC} | ${GREEN}debug${NC} | ${GREEN}pm${NC}"
                read -rp "  Tipo do agente: " agent_type
                run_cmd "bunx oh-my-ag verify \"$agent_type\" --workspace \"$PROJECT_DIR\""
                ;;

            # Atalhos rápidos
            20) spawn_agent "frontend" "gemini" ;;
            21) spawn_agent "backend" "codex" ;;
            22) spawn_agent "qa" "claude" ;;
            23) spawn_agent "debug" "claude" ;;
            24) spawn_agent "pm" "gemini" ;;

            0)
                echo -e "${GREEN}👋 Até mais!${NC}"
                echo ""
                exit 0
                ;;

            *)
                echo -e "${RED}❌ Opção inválida.${NC}"
                ;;
        esac

        echo ""
        read -rp "  Pressione ENTER para continuar..."
        clear
        show_banner
    done
}

main "$@"
