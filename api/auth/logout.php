<?php
/** POST /api/auth/logout.php — выход из системы */
require __DIR__ . '/../lib.php';
start_session();
$_SESSION = array();
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
}
session_destroy();
json_ok(array());
