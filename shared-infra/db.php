<?php
// /shared-infra/db.php
// Compatible con MAMP (localhost) y Docker (mysql)

$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '3306';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: 'Mango10<';
$db   = getenv('DB_NAME') ?: 'officespace_db';

$conn = mysqli_connect($host, $user, $pass, $db, (int)$port);
mysqli_set_charset($conn, 'utf8mb4');
if (!$conn) {
    
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "message" => "Error de conexión a la base de datos: " . mysqli_connect_error()
    ]);
    exit();
}

mysqli_set_charset($conn, 'utf8mb4');
?>