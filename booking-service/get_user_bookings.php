<?php
// /booking-service/get_user_bookings.php

// 1. Cabeceras CORS
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// 2. Validación JWT
$headers = getallheaders();
$auth = $headers['Authorization'] ?? '';

if (!str_starts_with($auth, 'Bearer ')) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "No autorizado. Token requerido."]);
    exit();
}

$token = substr($auth, 7);
$partes = explode('.', $token);

if (count($partes) !== 3) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Token inválido."]);
    exit();
}

$payload = json_decode(base64_decode(str_pad(
    strtr($partes[1], '-_', '+/'),
    strlen($partes[1]) % 4, '=', STR_PAD_RIGHT
)), true);

if (!$payload || !isset($payload['id_usuario'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Token malformado."]);
    exit();
}

// 3. Conexión a la base de datos
require_once '../shared-infra/db.php';

// 4. Usar el id_usuario del TOKEN (no del query string — más seguro)
$id_usuario = (int) $payload['id_usuario'];

// 5. Consulta relacional — solo reservas activas del usuario
$query = "
    SELECT r.id_reserva, r.fecha, r.hora_inicio, r.hora_fin, 
           r.asistentes, r.estatus, r.notas,
           e.nombre, e.tipo, e.piso
    FROM reservas r
    JOIN espacios e ON r.id_espacio = e.id_espacio
    WHERE r.id_usuario = $id_usuario
      AND r.estatus = 'Activa'
      AND r.fecha >= CURDATE()
    ORDER BY r.fecha ASC, r.hora_inicio ASC
";

$result = mysqli_query($conn, $query);
$reservas = [];

if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        $reservas[] = $row;
    }
}

http_response_code(200);
echo json_encode(["status" => "success", "data" => $reservas]);
?>