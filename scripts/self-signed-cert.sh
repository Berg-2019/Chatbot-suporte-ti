#!/bin/bash
# Generate self-signed wildcard cert for *.helpdeskmsm.local testing
# Run from inside the nginx container or on the host

CERT_DIR="/etc/nginx/ssl"
mkdir -p $CERT_DIR

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/wildcard.helpdeskmsm.local.key" \
  -out "$CERT_DIR/wildcard.helpdeskmsm.local.crt" \
  -subj "/C=BR/ST=SP/L=SaoPaulo/O=MSM/CN=*.helpdeskmsm.local" \
  2>/dev/null

echo "Self-signed cert generated in $CERT_DIR"