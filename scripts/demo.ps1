# =====================================================================
# NeoWallet — Demo de extremo a extremo (PowerShell) · con login real
# =====================================================================
# Recorre los casos de uso y demuestra que el dinero NUNCA se pierde.
# Requisitos: stack arriba (docker compose up --build).
# Uso:  powershell -File .\scripts\demo.ps1
# =====================================================================
$ErrorActionPreference = 'Stop'
$ACC = 'http://localhost:3000'
$PRO = 'http://localhost:3001'
$NOT = 'http://localhost:3002'
$KEY = 'neowallet-internal-key-change-me'   # clave servicio-a-servicio (demo)
$PWD_DEMO = 'Demo1234!'

function Title($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Ok($t)    { Write-Host "  OK  $t" -ForegroundColor Green }
function Info($t)  { Write-Host "  ->  $t" -ForegroundColor Gray }

function Login($email) {
  $r = Invoke-RestMethod "$ACC/auth/login" -Method Post -ContentType 'application/json' `
    -Body (@{ email = $email; password = $PWD_DEMO } | ConvertTo-Json)
  return $r
}
function AuthH($tok) { return @{ Authorization = "Bearer $tok" } }
function Total { (Invoke-RestMethod "$ACC/accounts/admin/total-balance" -Headers @{ 'x-internal-key' = $KEY }).total_balance }

Title 'Salud de los servicios'
Info "accounts:     $((Invoke-RestMethod "$ACC/health").status)"
Info "processor:    $((Invoke-RestMethod "$PRO/health").status)"
Info "notification: $((Invoke-RestMethod "$NOT/health").status)"

Title 'Inicio de sesion (login real)'
$A = Login 'usuario.a@neowallet.com'; $hA = AuthH $A.token
$B = Login 'usuario.b@neowallet.com'; $hB = AuthH $B.token
$C = Login 'usuario.c@neowallet.com'; $hC = AuthH $C.token
Ok "Sesion iniciada: A=$($A.user.id) B=$($B.user.id) C=$($C.user.id)"

Title 'Seguridad: endpoint protegido SIN token'
try { Invoke-RestMethod "$PRO/api/transactions/me" | Out-Null; Write-Host '  FALLO' -ForegroundColor Red }
catch { Ok 'Responde 401 sin token (protegido)' }

$totIni = Total; Info "TOTAL inicial del sistema: $totIni"

Title 'CU-004 · Recarga (Usuario B +200, con su token)'
$r = Invoke-RestMethod "$ACC/api/recharge" -Method Post -ContentType 'application/json' -Headers $hB `
  -Body (@{ amount = 200; payment_method = 'CREDIT_CARD' } | ConvertTo-Json)
Ok "Nuevo saldo de B: $($r.new_balance_formatted)"
$totRecarga = Total

Title 'CU-001 · Transferencia A -> B $100 (sender = token de A)'
$t = Invoke-RestMethod "$PRO/api/transfer" -Method Post -ContentType 'application/json' -Headers $hA `
  -Body (@{ receiver_id = $B.user.id; amount = 100 } | ConvertTo-Json)
Ok "Folio #$($t.transaction_id) $($t.status)  ·  A=$($t.sender_balance)  B=$($t.receiver_balance)"

Title 'CONSERVACION DEL DINERO (RNF-006)'
$totFin = Total
Info "Total tras recarga:       $totRecarga"
Info "Total tras transferencia: $totFin"
if ([math]::Abs($totFin - $totRecarga) -lt 0.001) { Ok 'La transferencia NO creo ni destruyo dinero.' }
else { Write-Host '  ERROR: el total cambio!' -ForegroundColor Red }

Title 'CU-002 · Fondos insuficientes (C intenta enviar $999)'
try {
  Invoke-RestMethod "$PRO/api/transfer" -Method Post -ContentType 'application/json' -Headers $hC `
    -Body (@{ receiver_id = $A.user.id; amount = 999 } | ConvertTo-Json) | Out-Null
} catch { Ok "Rechazada: $((($_.ErrorDetails.Message | ConvertFrom-Json)).error) (HTTP 400)" }

Title 'CU-003 · Auto-transferencia (A -> A)'
try {
  Invoke-RestMethod "$PRO/api/transfer" -Method Post -ContentType 'application/json' -Headers $hA `
    -Body (@{ receiver_id = $A.user.id; amount = 10 } | ConvertTo-Json) | Out-Null
} catch { Ok 'Rechazada: self_transfer_not_allowed (HTTP 400)' }

Title 'Idempotencia (misma Idempotency-Key dos veces)'
$key = "demo-$([guid]::NewGuid())"
$hAk = $hA + @{ 'Idempotency-Key' = $key }
$i1 = Invoke-RestMethod "$PRO/api/transfer" -Method Post -ContentType 'application/json' -Headers $hAk -Body (@{ receiver_id = $B.user.id; amount = 25 } | ConvertTo-Json)
$i2 = Invoke-RestMethod "$PRO/api/transfer" -Method Post -ContentType 'application/json' -Headers $hAk -Body (@{ receiver_id = $B.user.id; amount = 25 } | ConvertTo-Json)
Ok "1ra: folio #$($i1.transaction_id)  ·  2da: replay=$($i2.idempotent_replay) folio #$($i2.transaction_id)"

Title 'RF-005 · Historial del Usuario A'
(Invoke-RestMethod "$PRO/api/transactions/me" -Headers $hA).transactions | Select-Object -First 5 | ForEach-Object {
  Info ("{0,-9} {1,-20} $ {2}  [{3}]" -f $_.type, $_.counterparty_name, $_.amount_formatted, $_.status)
}

Title 'Confirmaciones por TELEFONO y CORREO (de B)'
Start-Sleep -Seconds 3
$mine = Invoke-RestMethod "$NOT/api/notifications/mine" -Headers $hB
$mine.sms | Select-Object -First 3 | ForEach-Object { Info "SMS:  $($_.body)" }
$mine.emails | Select-Object -First 3 | ForEach-Object { Info "MAIL: [$($_.provider)] $($_.subject)" }

Title 'Estado de cuenta por correo (de A)'
$s = Invoke-RestMethod "$PRO/api/transactions/me/statement" -Method Post -Headers $hA
Ok "Enviado a $($s.email) · $($s.transactions_included) movimientos"
if ($s.delivery.preview_url) { Info "Vista previa: $($s.delivery.preview_url)" }

Title 'Reconciliacion manual (bonus, clave interna)'
$rec = Invoke-RestMethod "$PRO/api/admin/reconcile" -Method Post -Headers @{ 'x-internal-key' = $KEY }
Ok "Revisadas: $($rec.checked) transacciones atascadas"

Write-Host "`nDemo completada." -ForegroundColor Magenta
