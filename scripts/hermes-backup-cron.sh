#!/bin/bash
# =============================================================================
# Hermes WhatsApp Session Backup Script
#
# Daily backup of WhatsApp session for disaster recovery.
# Should be run as a cron job.
#
# Cron example (run daily at 3 AM):
#   0 3 * * * /home/dev/Projetos/Chatbot-suporte-ti/scripts/hermes-backup-cron.sh
# =============================================================================

SESSION_VOLUME="helpdesk_hermes_whatsapp_session"
BACKUP_DIR="/var/backups/hermes-sessions"
RETENTION_DAYS=30

# Ensure backup directory exists
mkdir -p ${BACKUP_DIR}

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hermes-session-${TIMESTAMP}.tar.gz"

# Create backup
docker run --rm \
    -v ${SESSION_VOLUME}:/session:ro \
    -v ${BACKUP_DIR}:/backup \
    alpine tar czf ${BACKUP_FILE} -C /session . 2>/dev/null

if [ $? -eq 0 ]; then
    echo "$(date): Backup created: ${BACKUP_FILE}"

    # Clean up old backups
    find ${BACKUP_DIR} -name "hermes-session-*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    echo "$(date): Old backups cleaned (retention: ${RETENTION_DAYS} days)"
else
    echo "$(date): ERROR: Backup failed!" >&2
    exit 1
fi