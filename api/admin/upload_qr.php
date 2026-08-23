<?php
/**
 * POST /api/admin/upload_qr.php  (multipart: file=qr)
 * Загружает QR-код оплаты. Сохраняется как api/qr.png, доступен по /api/qr.png.
 * action=delete — удалить QR.
 */
require __DIR__ . '/../lib.php';
require_auth('admin');

$target = __DIR__ . '/../qr.png';

if (isset($_GET['action']) && $_GET['action'] === 'delete') {
    if (is_file($target)) @unlink($target);
    json_ok(array('qr' => null));
}

if (empty($_FILES['qr']) || $_FILES['qr']['error'] !== UPLOAD_ERR_OK) {
    json_err('Файл не получен', 400);
}
$f = $_FILES['qr'];
// проверка, что это изображение
$info = @getimagesize($f['tmp_name']);
if (!$info) json_err('Это не изображение', 400);
if ($f['size'] > 1500 * 1024) json_err('Файл больше 1.5 МБ', 400);

if (!@move_uploaded_file($f['tmp_name'], $target)) {
    json_err('Не удалось сохранить файл', 500);
}
json_ok(array('qr' => '/api/qr.png?t=' . time()));
