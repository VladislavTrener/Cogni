<?php
/**
 * GET /api/bootstrap.php
 * Возвращает полное состояние приложения в формате фронтенда.
 * Публично: courses + settings + me. Остальное — по роли вошедшего.
 */
require __DIR__ . '/lib.php';

$me = current_user();
$role = $me ? $me['role'] : null;

$settings = array(
    'trialDays' => (int)get_setting('demo_days', 3),
    'qr' => is_file(__DIR__ . '/qr.png') ? '/api/qr.png' : null,
);

// Информация о сессии (для восстановления после перезагрузки страницы)
$meInfo = null;
if ($me) {
    if ($role === 'student') {
        $st = one("SELECT id FROM kgn_students WHERE user_id = ?", array((int)$me['id']));
        $meInfo = array('userId' => $st ? (string)$st['id'] : (string)$me['id'], 'role' => 'student');
    } else {
        $meInfo = array('userId' => (string)$me['id'], 'role' => $role);
    }
}

$response = array(
    'courses' => all_courses_frontend(),
    'settings' => $settings,
    'me' => $meInfo,
);

if ($role === 'student') {
    $sid = isset($_SESSION['student_id']) ? (int)$_SESSION['student_id'] : 0;
    $my = $sid ? get_full_student($sid) : null;
    $response['students'] = $my ? array($my) : array();
    $response['promotions'] = all_promotions_frontend();
    $response['payments'] = array();
    if ($sid) {
        foreach (q("SELECT * FROM kgn_payments WHERE student_id = ? ORDER BY id DESC", array($sid)) as $p) {
            $response['payments'][] = array(
                'id' => (string)$p['id'],
                'date' => date('d.m.Y', strtotime($p['created_at'])),
                'studentId' => (string)$p['student_id'],
                'studentName' => $my ? $my['name'] : '—',
                'item' => $p['item'],
                'purpose' => $p['purpose'],
                'amount' => (int)$p['amount'],
                'method' => $p['method'],
                'status' => 'оплачен',
                'fresh' => false,
            );
        }
    }
} elseif ($role === 'teacher') {
    $response['students'] = all_students_frontend();
    $response['promotions'] = all_promotions_frontend();
    $response['payments'] = array();
} elseif ($role === 'admin') {
    $students = all_students_frontend();
    $response['students'] = $students;
    $response['promotions'] = all_promotions_frontend();
    // аккаунты (без паролей)
    $accounts = array();
    foreach (q("SELECT id, login, role, name, student_id FROM kgn_users ORDER BY id") as $u) {
        $accounts[] = array(
            'id' => (string)$u['id'],
            'role' => $u['role'],
            'name' => $u['name'],
            'login' => $u['login'],
            'studentId' => $u['student_id'] ? (string)$u['student_id'] : null,
        );
    }
    $response['accounts'] = $accounts;
    // платежи
    $idToName = array();
    foreach ($students as $s) $idToName[$s['id']] = $s['name'];
    $payments = array();
    foreach (q("SELECT * FROM kgn_payments ORDER BY id DESC") as $p) {
        $payments[] = array(
            'id' => (string)$p['id'],
            'date' => date('d.m.Y', strtotime($p['created_at'])),
            'studentId' => (string)$p['student_id'],
            'studentName' => isset($idToName[(string)$p['student_id']]) ? $idToName[(string)$p['student_id']] : '—',
            'item' => $p['item'],
            'purpose' => $p['purpose'],
            'amount' => (int)$p['amount'],
            'method' => $p['method'],
            'status' => 'оплачен',
            'fresh' => false,
        );
    }
    $response['payments'] = $payments;
}

json_ok($response);
