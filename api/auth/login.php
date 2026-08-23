<?php
/**
 * POST /api/auth/login.php  { login, password }
 * Вход с защитой от подбора: 3 неудачные попытки -> блокировка на 5 минут.
 */
require __DIR__ . '/../lib.php';

$body = read_body();
$login = strtolower(trim(isset($body['login']) ? $body['login'] : ''));
$password = isset($body['password']) ? $body['password'] : '';
if ($login === '' || $password === '') json_err('Введите логин и пароль', 400);

// блокировка
$att = one("SELECT * FROM kgn_login_attempts WHERE login = ?", array($login));
if ($att && $att['locked_until'] && strtotime($att['locked_until']) > time()) {
    $min = (int)ceil((strtotime($att['locked_until']) - time()) / 60);
    json_err('Вход заблокирован. Попробуйте через ' . $min . ' мин.', 423);
}

$user = one("SELECT * FROM kgn_users WHERE login = ?", array($login));
if (!$user || !password_verify($password, $user['pass_hash'])) {
    $fails = ($att ? (int)$att['fails'] : 0) + 1;
    if ($fails >= 3) {
        run("INSERT INTO kgn_login_attempts (login, fails, locked_until) VALUES (?, 0, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
             ON DUPLICATE KEY UPDATE fails=0, locked_until=DATE_ADD(NOW(), INTERVAL 5 MINUTE)", array($login));
        json_err('Слишком много попыток. Вход заблокирован на 5 минут.', 423);
    }
    run("INSERT INTO kgn_login_attempts (login, fails) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE fails = ?", array($login, $fails, $fails));
    json_err('Неверный логин или пароль. Осталось попыток: ' . (3 - $fails), 401);
}

// успех — сбросить счётчик
run("INSERT INTO kgn_login_attempts (login, fails) VALUES (?, 0)
     ON DUPLICATE KEY UPDATE fails=0, locked_until=NULL", array($login));

if ((int)$user['suspended']) json_err('Доступ приостановлен. Обратитесь к администратору.', 403);

start_session();
session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['role'] = $user['role'];

$userId = (string)$user['id'];
if ($user['role'] === 'student') {
    $st = one("SELECT id FROM kgn_students WHERE user_id = ?", array((int)$user['id']));
    $sid = $st ? (int)$st['id'] : null;
    $_SESSION['student_id'] = $sid;
    if ($sid) $userId = (string)$sid;
}

json_ok(array('userId' => $userId, 'role' => $user['role'], 'name' => $user['name']));
