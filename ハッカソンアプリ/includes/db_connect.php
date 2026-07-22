<?php
declare(strict_types=1);

$host = 'localhost';
$dbname = 'your_database';
$user = 'your_username';
$password = 'your_password';

try {
    $pdo = new PDO(
        "mysql:host={$host};dbname={$dbname};charset=utf8mb4",
        $user,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    die('データベース接続に失敗しました: ' . $e->getMessage());
}
