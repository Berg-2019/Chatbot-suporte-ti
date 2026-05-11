#!/bin/bash
# ==============================================================================
# Helpdesk MSM - Gerar wildcard certificate via DNS-01 Let's Encrypt
# Domínio: *.helpdeskmsm.com.br + helpdeskmsm.com.br
# Requer: acesso DNS para criar registro TXT _acme-challenge.helpdeskmsm.com.br
# ==============================================================================

set -euo pipefail

DOMAIN="${DOMAIN:-helpdeskmsm.com.br}"
EMAIL="${EMAIL:-dev@helpdeskmsm.com.br}"
CERT_DIR="${CERT_DIR:-/etc/letsencrypt/live/$DOMAIN}"
STAGING="${STAGING:-0}"

echo "=============================================="
echo "  Helpdesk MSM - Wildcard Certificate Gen"
echo "=============================================="
echo "  Domain: *.$DOMAIN"
echo "  Email:  $EMAIL"
echo "  Certs:  $CERT_DIR"
echo "  Staging: $STAGING"
echo "=============================================="

# Verificar dependências
for cmd in certbot dig openssl; do
    if ! command -v $cmd &>/dev/null; then
        echo "ERRO: $cmd não encontrado. Instale com: apt install $cmd"
        exit 1
    fi
done

# Modo staging para não estourar rate limits durante testes
STAGING_FLAG=""
if [ "$STAGING" = "1" ]; then
    STAGING_FLAG="--staging"
    echo ">>> MODO STAGING ATIVADO (não afeta rate limits de produção)"
fi

# Gerar certificate wildcard via DNS-01
# O certbot vai pedir para criar um registro TXT no DNS
echo ""
echo ">>> Iniciando certbot em modo manual com desafio DNS-01"
echo ">>> Você precisará adicionar um registro TXT no seu provedor DNS:"
echo ">>>   Tipo: TXT"
echo ">>>   Nome: _acme-challenge"
echo ">>>   Valor: [valor fornecido pelo certbot]"
echo ""

# Executar certbot
certbot certonly \
    --manual \
    --preferred-challenges dns \
    $STAGING_FLAG \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --manual-public-ip-logging-ok \
    -d "*.$DOMAIN" \
    -d "$DOMAIN"

# Verificar se deu certo
if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
    echo ""
    echo "=============================================="
    echo "  ✅ Certificado gerado com sucesso!"
    echo "=============================================="
    echo "  fullchain: $CERT_DIR/fullchain.pem"
    echo "  privkey:   $CERT_DIR/privkey.pem"
    echo ""
    echo "  Para copiar pro diretório do projeto:"
    echo "  cp $CERT_DIR/fullchain.pem ./nginx/certs/wildcard.$DOMAIN.crt"
    echo "  cp $CERT_DIR/privkey.pem   ./nginx/certs/wildcard.$DOMAIN.key"
    echo ""
    echo "  Renovação automática já configurada via systemd timer."
    echo "  Verificar renewals: systemctl list-timers | grep certbot"
else
    echo ""
    echo "=============================================="
    echo "  ❌ Falha ao gerar certificado"
    echo "=============================================="
    exit 1
fi
