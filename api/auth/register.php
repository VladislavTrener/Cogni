<?php
/**
 * POST /api/auth/register.php  { name, phone, email, password }
 * Регистрация нового ученика: аккаунт + профиль + демо-доступ на N дней.
 * Автоматически входит в систему.
 */
require __DIR__ . '/../lib.php';

$body = read_body();
$name  = trim(isset($body['name']) ? $body['name'] : '');
$phone = trim(isset($body['phone']) ? $body['phone'] : '');
$email = strtolower(trim(isset($body['email']) ? $body['email'] : ''));
$password = isset($body['password']) ? $body['password'] : '';

if ($name === '') json_err('Укажите имя', 400);
if ($phone === '') json_err('Укажите телефон', 400);
if (!preg_match('/^[^@\s]+@[^@\s]+\.[^@\s]+$/', $email)) json_err('Укажите корректный e-mail', 400);
if (strlen($password) < 6) json_err('Пароль должен быть не короче 6 символов', 400);

if (one("SELECT id FROM kgn_users WHERE login = ?", array($email))) {
    json_err('Этот e-mail уже зарегистрирован', 409);
}

$trialDays = (int)get_setting('demo_days', 3);
$hash = password_hash($password, PASSWORD_DEFAULT);

// аккаунт (логин = e-mail)
$userId = run("INSERT INTO kgn_users (login, pass_hash, role, name, phone, email) VALUES (?, ?, 'student', ?, ?, ?)",
    array($email, $hash, $name, $phone, $email));

// профиль ученика + демо-доступ
$colors = array('#ff8a3d', '#2fa8dc', '#1fa97a', '#e8a912', '#f05d50');
$color = $colors[array_rand($colors)];
$studentId = run(
    "INSERT INTO kgn_students (user_id, name, age, grp, color, trial_until)
     VALUES (?, ?, 9, 'А', ?, DATE_ADD(NOW(), INTERVAL ? DAY))",
    array($userId, $name, $color, $trialDays));

run("UPDATE kgn_users SET student_id = ? WHERE id = ?", array($studentId, $userId));

// авто-вход
start_session();
session_regenerate_id(true);
$_SESSION['user_id'] = $userId;
$_SESSION['role'] = 'student';
$_SESSION['student_id'] = $studentId;

json_ok(array(
    'userId' => (string)$studentId,
    'role' => 'student',
    'name' => $name,
    'trialDays' => $trialDays,
));
