#!/bin/bash
# ══════════════════════════════════════════════════════════════════════
# NeoWallet P2P Payments — Script de pruebas cURL
# Cubre todos los casos posibles según los requerimientos
#
# Uso:
#   chmod +x curls.sh
#   ./curls.sh
#
# O ejecutar individualmente cada sección
# ══════════════════════════════════════════════════════════════════════

ACCOUNTS_URL="http://localhost:3000"
PROCESSOR_URL="http://localhost:3001"
INTERNAL_KEY="internal-neowallet-key-2026"

echo "═══════════════════════════════════════════════════════"
echo "  NeoWallet - Suite de Pruebas cURL"
echo "  Asegúrate de que los servicios estén corriendo:"
echo "  docker-compose up -d"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────────
# 1. AUTENTICACIÓN
# ─────────────────────────────────────────────────────────────────────
echo "━━━ 1. AUTENTICACIÓN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "✅ 1.1 Obtener token - Usuario A (exitoso)"
TOKEN_A=$(curl -s -X POST "$ACCOUNTS_URL/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario.a@neowallet.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)
echo "Token A: ${TOKEN_A:0:50}..."

echo ""
echo "✅ 1.2 Obtener token - Usuario B"
TOKEN_B=$(curl -s -X POST "$ACCOUNTS_URL/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario.b@neowallet.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)
echo "Token B: ${TOKEN_B:0:50}..."

echo ""
echo "❌ 1.3 Credenciales inválidas (debe retornar 401)"
curl -s -X POST "$ACCOUNTS_URL/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario.a@neowallet.com","password":"wrong-password"}' | python3 -m json.tool

echo ""
echo "❌ 1.4 Email con formato inválido (debe retornar 400)"
curl -s -X POST "$ACCOUNTS_URL/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"email":"no-es-un-email","password":"password123"}' | python3 -m json.tool

# ─────────────────────────────────────────────────────────────────────
# 2. RF-001: CONSULTAR SALDO
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━ 2. RF-001: CONSULTAR SALDO ━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "✅ 2.1 Consultar saldo Usuario A (saldo: \$1000)"
curl -s -X GET "$ACCOUNTS_URL/accounts/1" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "✅ 2.2 Consultar saldo Usuario B (saldo: \$50)"
curl -s -X GET "$ACCOUNTS_URL/accounts/2" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "✅ 2.3 Consultar saldo Usuario C (saldo: \$0)"
curl -s -X GET "$ACCOUNTS_URL/accounts/3" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "❌ 2.4 Usuario no existe (debe retornar 404)"
curl -s -X GET "$ACCOUNTS_URL/accounts/999" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "❌ 2.5 Sin token JWT (debe retornar 401)"
curl -s -X GET "$ACCOUNTS_URL/accounts/1" | python3 -m json.tool

echo ""
echo "❌ 2.6 Token inválido (debe retornar 401)"
curl -s -X GET "$ACCOUNTS_URL/accounts/1" \
  -H "Authorization: Bearer token-invalido-xxx" | python3 -m json.tool

# ─────────────────────────────────────────────────────────────────────
# 3. RF-002: RECARGAR SALDO
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━ 3. RF-002: RECARGAR SALDO ━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "✅ 3.1 Recarga exitosa Usuario C (0 → \$500)"
curl -s -X POST "$ACCOUNTS_URL/api/recharge" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"userId":3,"amount":500.00,"paymentMethod":"CREDIT_CARD"}' | python3 -m json.tool

echo ""
echo "✅ 3.2 Recarga con monto decimal"
curl -s -X POST "$ACCOUNTS_URL/api/recharge" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"amount":99.99,"paymentMethod":"DEBIT_CARD"}' | python3 -m json.tool

echo ""
echo "❌ 3.3 Monto negativo (debe retornar 400)"
curl -s -X POST "$ACCOUNTS_URL/api/recharge" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"amount":-50.00,"paymentMethod":"CARD"}' | python3 -m json.tool

echo ""
echo "❌ 3.4 Monto cero (debe retornar 400)"
curl -s -X POST "$ACCOUNTS_URL/api/recharge" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"amount":0,"paymentMethod":"CARD"}' | python3 -m json.tool

echo ""
echo "❌ 3.5 Usuario inexistente (debe retornar 404)"
curl -s -X POST "$ACCOUNTS_URL/api/recharge" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"userId":999,"amount":100.00,"paymentMethod":"CARD"}' | python3 -m json.tool

echo ""
echo "❌ 3.6 Monto excede el máximo (debe retornar 400)"
curl -s -X POST "$ACCOUNTS_URL/api/recharge" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"amount":60000.00,"paymentMethod":"CARD"}' | python3 -m json.tool

# ─────────────────────────────────────────────────────────────────────
# 4. RF-004: UPDATE BALANCE (INTERNO)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━ 4. RF-004: UPDATE BALANCE (INTERNO) ━━━━━━━━━━━━━"

echo ""
echo "✅ 4.1 Débito exitoso con API Key interna"
curl -s -X POST "$ACCOUNTS_URL/accounts/update-balance" \
  -H "X-Internal-Api-Key: $INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"amount":50.00,"operation":"debit"}' | python3 -m json.tool

echo ""
echo "✅ 4.2 Crédito exitoso con API Key interna"
curl -s -X POST "$ACCOUNTS_URL/accounts/update-balance" \
  -H "X-Internal-Api-Key: $INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":2,"amount":50.00,"operation":"credit"}' | python3 -m json.tool

echo ""
echo "❌ 4.3 Sin API Key interna (debe retornar 403)"
curl -s -X POST "$ACCOUNTS_URL/accounts/update-balance" \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"amount":50.00,"operation":"debit"}' | python3 -m json.tool

echo ""
echo "❌ 4.4 Fondos insuficientes en débito (debe retornar 400)"
curl -s -X POST "$ACCOUNTS_URL/accounts/update-balance" \
  -H "X-Internal-Api-Key: $INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":2,"amount":9999.00,"operation":"debit"}' | python3 -m json.tool

echo ""
echo "❌ 4.5 Operación inválida (debe retornar 400)"
curl -s -X POST "$ACCOUNTS_URL/accounts/update-balance" \
  -H "X-Internal-Api-Key: $INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"amount":50.00,"operation":"transfer"}' | python3 -m json.tool

# ─────────────────────────────────────────────────────────────────────
# 5. RF-003: TRANSFERENCIA P2P
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━ 5. RF-003: TRANSFERENCIA P2P ━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "✅ 5.1 CU-001: Transferencia exitosa A→B (\$100)"
curl -s -X POST "$PROCESSOR_URL/api/transfer" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"senderId":1,"receiverId":2,"amount":100.00}' | python3 -m json.tool

echo ""
echo "✅ 5.2 Verificar saldo actualizado de A"
curl -s -X GET "$ACCOUNTS_URL/accounts/1" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "✅ 5.3 Verificar saldo actualizado de B"
curl -s -X GET "$ACCOUNTS_URL/accounts/2" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "❌ 5.4 CU-002: Fondos insuficientes (B intenta transferir \$1000)"
curl -s -X POST "$PROCESSOR_URL/api/transfer" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"senderId":2,"receiverId":1,"amount":1000.00}' | python3 -m json.tool

echo ""
echo "❌ 5.5 CU-003: Auto-transferencia (debe retornar 400)"
curl -s -X POST "$PROCESSOR_URL/api/transfer" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"senderId":1,"receiverId":1,"amount":50.00}' | python3 -m json.tool

echo ""
echo "❌ 5.6 Monto negativo (debe retornar 400)"
curl -s -X POST "$PROCESSOR_URL/api/transfer" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"senderId":1,"receiverId":2,"amount":-100.00}' | python3 -m json.tool

echo ""
echo "❌ 5.7 Monto cero (debe retornar 400)"
curl -s -X POST "$PROCESSOR_URL/api/transfer" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"senderId":1,"receiverId":2,"amount":0}' | python3 -m json.tool

echo ""
echo "❌ 5.8 Sender no existe (debe retornar 404)"
curl -s -X POST "$PROCESSOR_URL/api/transfer" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"senderId":999,"receiverId":2,"amount":50.00}' | python3 -m json.tool

echo ""
echo "❌ 5.9 Receiver no existe (debe retornar 404)"
curl -s -X POST "$PROCESSOR_URL/api/transfer" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"senderId":1,"receiverId":999,"amount":50.00}' | python3 -m json.tool

echo ""
echo "❌ 5.10 Sin autenticación (debe retornar 401)"
curl -s -X POST "$PROCESSOR_URL/api/transfer" \
  -H "Content-Type: application/json" \
  -d '{"senderId":1,"receiverId":2,"amount":50.00}' | python3 -m json.tool

echo ""
echo "✅ 5.11 Transferencia con monto decimal"
curl -s -X POST "$PROCESSOR_URL/api/transfer" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"senderId":1,"receiverId":3,"amount":0.01}' | python3 -m json.tool

# ─────────────────────────────────────────────────────────────────────
# 6. RF-005: HISTORIAL DE TRANSACCIONES (BONUS)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━ 6. RF-005: HISTORIAL DE TRANSACCIONES ━━━━━━━━━━━"

echo ""
echo "✅ 6.1 Historial de Usuario A"
curl -s -X GET "$PROCESSOR_URL/api/transactions/1" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "✅ 6.2 Historial de Usuario B"
curl -s -X GET "$PROCESSOR_URL/api/transactions/2" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "✅ 6.3 Historial de Usuario C (sin transacciones aún)"
curl -s -X GET "$PROCESSOR_URL/api/transactions/3" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

# ─────────────────────────────────────────────────────────────────────
# 7. HEALTH CHECKS
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━ 7. HEALTH CHECKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "✅ 7.1 Accounts Service Health"
curl -s "$ACCOUNTS_URL/actuator/health" | python3 -m json.tool

echo ""
echo "✅ 7.2 Processor Service Health"
curl -s "$PROCESSOR_URL/actuator/health" | python3 -m json.tool

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Pruebas completadas"
echo "═══════════════════════════════════════════════════════"
