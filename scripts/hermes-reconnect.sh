#!/bin/bash
# =============================================================================
# Hermes WhatsApp Session Recovery Script
#
# Reconnects Hermes to WhatsApp without rebuilding containers.
# Handles QR code generation and session recovery.
#
# Usage:
#   ./hermes-reconnect.sh              # Normal reconnection
#   ./hermes-reconnect.sh --force-qr   # Force new QR code
#   ./hermes-reconnect.sh --backup     # Backup session before reconnecting
# =============================================================================

set -e

CONTAINER_NAME="helpdesk_hermes"
SESSION_VOLUME="helpdesk_hermes_whatsapp_session"
BACKUP_DIR="/tmp/hermes-session-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# -----------------------------------------------------------------------------
# Check if container exists and is running
# -----------------------------------------------------------------------------
check_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "Container ${CONTAINER_NAME} is not running!"
        exit 1
    fi
    log_info "Container ${CONTAINER_NAME} is running"
}

# -----------------------------------------------------------------------------
# Check WhatsApp session status
# -----------------------------------------------------------------------------
check_session() {
    log_info "Checking WhatsApp session status..."

    # Try to get session info from the container
    SESSION_STATUS=$(docker exec ${CONTAINER_NAME} sh -c "
        if [ -f /root/.hermes/platforms/whatsapp/session/creds.json ]; then
            echo 'AUTHENTICATED'
        else
            echo 'NOT_AUTHENTICATED'
        fi
    " 2>/dev/null || echo "UNKNOWN")

    echo $SESSION_STATUS
}

# -----------------------------------------------------------------------------
# Backup session volume
# -----------------------------------------------------------------------------
backup_session() {
    log_info "Backing up WhatsApp session..."

    mkdir -p ${BACKUP_DIR}

    BACKUP_FILE="${BACKUP_DIR}/hermes-session-${TIMESTAMP}.tar.gz"

    docker run --rm \
        -v ${SESSION_VOLUME}:/session:ro \
        -v ${BACKUP_DIR}:/backup \
        alpine tar czf /backup/hermes-session-${TIMESTAMP}.tar.gz -C /session . 2>/dev/null

    log_success "Session backed up to ${BACKUP_FILE}"

    # Keep only last 5 backups
    ls -1t ${BACKUP_DIR}/hermes-session-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
    log_info "Cleaned up old backups (keeping last 5)"
}

# -----------------------------------------------------------------------------
# Restore session from backup
# -----------------------------------------------------------------------------
restore_session() {
    LATEST_BACKUP=$(ls -1t ${BACKUP_DIR}/hermes-session-*.tar.gz 2>/dev/null | head -1)

    if [ -z "$LATEST_BACKUP" ]; then
        log_error "No backup found to restore!"
        exit 1
    fi

    log_warn "Restoring session from ${LATEST_BACKUP}..."

    docker run --rm \
        -v ${SESSION_VOLUME}:/session \
        -v ${BACKUP_DIR}:/backup \
        alpine sh -c "rm -rf /session/* && tar xzf /backup/$(basename $LATEST_BACKUP) -C /session"

    log_success "Session restored from ${LATEST_BACKUP}"
}

# -----------------------------------------------------------------------------
# Generate new QR code
# -----------------------------------------------------------------------------
generate_qr() {
    log_info "Requesting new QR code..."

    # Send command to Hermes to generate new QR
    docker exec ${CONTAINER_NAME} sh -c "
        cd /opt/hermes
        node scripts/reset-whatsapp.js 2>/dev/null || echo 'RESET_CMD_NOT_FOUND'
    " 2>/dev/null || true

    # Alternative: restart the WhatsApp platform to get new QR
    docker exec ${CONTAINER_NAME} sh -c "
        pkill -f 'baileys' 2>/dev/null || true
        sleep 2
    " 2>/dev/null || true

    # Check for QR code in logs
    log_info "Checking for QR code in container logs..."
    docker logs --tail 50 ${CONTAINER_NAME} 2>&1 | grep -i "qr" | tail -5 || true

    log_success "QR code requested. Check container logs with:"
    echo "  docker logs --tail 100 ${CONTAINER_NAME} 2>&1 | grep -i 'qr'"
}

# -----------------------------------------------------------------------------
# Restart WhatsApp connection
# -----------------------------------------------------------------------------
restart_whatsapp() {
    log_info "Restarting WhatsApp connection..."

    # Restart Hermes container (this will try to reconnect with existing session)
    docker restart ${CONTAINER_NAME}

    log_success "Container restarted. Waiting for WhatsApp connection..."

    # Wait for container to be healthy
    sleep 5

    # Check logs for connection status
    docker logs --tail 30 ${CONTAINER_NAME} 2>&1 | grep -iE "connected|disconnected|qr" | tail -10 || true
}

# -----------------------------------------------------------------------------
# Full reconnect procedure
# -----------------------------------------------------------------------------
full_reconnect() {
    check_container

    SESSION_STATUS=$(check_session)
    log_info "Current session status: ${SESSION_STATUS}"

    if [ "$SESSION_STATUS" = "AUTHENTICATED" ]; then
        log_info "Session exists. Attempting to reconnect..."

        # Restart to force reconnection
        restart_whatsapp

        # Check if reconnected
        sleep 5
        NEW_STATUS=$(check_session)
        if [ "$NEW_STATUS" = "AUTHENTICATED" ]; then
            log_success "Reconnected successfully!"
        else
            log_warn "Session may have expired. Generating new QR code..."
            generate_qr
        fi
    else
        log_warn "No valid session found. Generating new QR code..."
        generate_qr
    fi
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
main() {
    echo ""
    echo "=========================================="
    echo "  Hermes WhatsApp Reconnection Tool"
    echo "=========================================="
    echo ""

    case "${1:-}" in
        --force-qr)
            check_container
            backup_session
            generate_qr
            ;;
        --backup)
            check_container
            backup_session
            ;;
        --restore)
            check_container
            restore_session
            ;;
        --status)
            check_container
            SESSION_STATUS=$(check_session)
            echo ""
            echo "Session Status: ${SESSION_STATUS}"
            echo ""
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  (none)       Full reconnect procedure"
            echo "  --force-qr   Force new QR code generation"
            echo "  --backup     Backup session before any action"
            echo "  --restore    Restore session from latest backup"
            echo "  --status     Check session status only"
            echo "  --help       Show this help message"
            echo ""
            ;;
        *)
            check_container
            backup_session
            full_reconnect
            ;;
    esac

    echo ""
}

main "$@"