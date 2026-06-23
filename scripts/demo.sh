#!/usr/bin/env bash
# =====================================================================
# NeoWallet — Demo de extremo a extremo (bash + curl + jq) · login real
# =====================================================================
set -euo pipefail
ACC=http://localhost:3000
PRO=http://localhost:3001
NOT=http://localhost:3002
KEY=neowallet-internal-key-change-me
PW='Demo1234!'

title(){ printf "\n\033[36m=== %s ===\033[0m\n" "$1"; }
ok(){ printf "\033[32m  OK  %s\033[0m\n" "$1"; }
info(){ printf "\033[90m  ->  %s\033[0m\n" "$1"; }

login(){ curl -s "$ACC/auth/login" -H 'content-type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PW\"}"; }
total(){ curl -s "$ACC/accounts/admin/total-balance" -H "x-internal-key: $KEY" | jq -r '.total_balance'; }

title "Salud de los servicios"
info "accounts:     $(curl -s "$ACC/health" | jq -r '.status')"
info "processor:    $(curl -s "$PRO/health" | jq -r '.status')"
info "notification: $(curl -s "$NOT/health" | jq -r '.status')"

title "Login real"
A=$(login usuario.a@neowallet.com); TA=$(echo "$A" | jq -r '.token'); IDA=$(echo "$A" | jq -r '.user.id')
B=$(login usuario.b@neowallet.com); TB=$(echo "$B" | jq -r '.token'); IDB=$(echo "$B" | jq -r '.user.id')
C=$(login usuario.c@neowallet.com); TC=$(echo "$C" | jq -r '.token'); IDC=$(echo "$C" | jq -r '.user.id')
ok "Sesiones: A=$IDA B=$IDB C=$IDC"

title "Seguridad: sin token -> 401"
code=$(curl -s -o /dev/null -w '%{http_code}' "$PRO/api/transactions/me"); [ "$code" = "401" ] && ok "401 sin token" || echo "  FALLO ($code)"

TOT_INI=$(total); info "TOTAL inicial: $TOT_INI"

title "CU-004 · Recarga (B +200, con su token)"
curl -s "$ACC/api/recharge" -H "authorization: Bearer $TB" -H 'content-type: application/json' \
  -d '{"amount":200,"payment_method":"CREDIT_CARD"}' | jq -r '"  OK  Nuevo saldo B: $\(.new_balance_formatted)"'
TOT_R=$(total)

title "CU-001 · Transferencia A -> B \$100 (sender = token A)"
curl -s "$PRO/api/transfer" -H "authorization: Bearer $TA" -H 'content-type: application/json' \
  -d "{\"receiver_id\":$IDB,\"amount\":100}" | jq -r '"  OK  Folio #\(.transaction_id) \(.status) · A=\(.sender_balance) B=\(.receiver_balance)"'

title "CONSERVACION DEL DINERO (RNF-006)"
TOT_F=$(total); info "Total tras recarga: $TOT_R   tras transferencia: $TOT_F"
[ "$TOT_R" = "$TOT_F" ] && ok "La transferencia NO creo ni destruyo dinero." || printf "\033[31m  ERROR\033[0m\n"

title "CU-002 · Fondos insuficientes (C envia \$999)"
curl -s "$PRO/api/transfer" -H "authorization: Bearer $TC" -H 'content-type: application/json' \
  -d "{\"receiver_id\":$IDA,\"amount\":999}" | jq -r '"  OK  Rechazada: \(.error)"'

title "CU-003 · Auto-transferencia (A -> A)"
curl -s "$PRO/api/transfer" -H "authorization: Bearer $TA" -H 'content-type: application/json' \
  -d "{\"receiver_id\":$IDA,\"amount\":10}" | jq -r '"  OK  Rechazada: \(.error)"'

title "Idempotencia (misma Idempotency-Key)"
K="demo-$RANDOM$RANDOM"
curl -s "$PRO/api/transfer" -H "authorization: Bearer $TA" -H "Idempotency-Key: $K" -H 'content-type: application/json' -d "{\"receiver_id\":$IDB,\"amount\":25}" | jq -r '"  OK  1ra: folio #\(.transaction_id)"'
curl -s "$PRO/api/transfer" -H "authorization: Bearer $TA" -H "Idempotency-Key: $K" -H 'content-type: application/json' -d "{\"receiver_id\":$IDB,\"amount\":25}" | jq -r '"  OK  2da: replay=\(.idempotent_replay) folio #\(.transaction_id)"'

title "RF-005 · Historial del Usuario A"
curl -s "$PRO/api/transactions/me" -H "authorization: Bearer $TA" | jq -r '.transactions[:5][] | "  -> \(.type) \(.counterparty_name) $\(.amount_formatted) [\(.status)]"'

title "Confirmaciones por TELEFONO y CORREO (de B)"
sleep 3
curl -s "$NOT/api/notifications/mine" -H "authorization: Bearer $TB" | jq -r '.sms[:3][] | "  -> SMS: \(.body)"'
curl -s "$NOT/api/notifications/mine" -H "authorization: Bearer $TB" | jq -r '.emails[:3][] | "  -> MAIL: [\(.provider)] \(.subject)"'

title "Estado de cuenta por correo (de A)"
curl -s "$PRO/api/transactions/me/statement" -X POST -H "authorization: Bearer $TA" \
  | jq -r '"  OK  Enviado a \(.email) · \(.transactions_included) movimientos\n  -> preview: \(.delivery.preview_url // "n/a")"'

title "Reconciliacion manual (clave interna)"
curl -s "$PRO/api/admin/reconcile" -X POST -H "x-internal-key: $KEY" | jq -r '"  OK  Revisadas: \(.checked)"'

printf "\n\033[35mDemo completada.\033[0m\n"
