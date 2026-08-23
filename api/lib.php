<?php
/**
 * Когнитив.Про — общая библиотека API.
 * Подключение к БД, JSON-ответы, сессии, авторизация, конвертеры данных.
 * Совместимо с PHP 5.5+ (в т.ч. 8.x).
 */

/* ---------- БД ---------- */
function db() {
    static $conn = null;
    if ($conn) return $conn;
    $cfg = __DIR__ . '/../config.php';
    if (!is_file($cfg)) $cfg = __DIR__ . '/config.php';
    if (!is_file($cfg)) json_err('config.php не найден', 500);
    require_once $cfg;
    $conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_errno) json_err('Нет подключения к БД: ' . $conn->connect_error, 500);
    $conn->set_charset('utf8mb4');
    return $conn;
}

function q($sql, $params = array()) {
    $d = db();
    if (empty($params)) {
        $res = $d->query($sql);
        if (!$res) json_err('DB: ' . $d->error, 500);
        $rows = array();
        while ($r = $res->fetch_assoc()) $rows[] = $r;
        return $rows;
    }
    $stmt = $d->prepare($sql);
    if (!$stmt) json_err('DB prepare: ' . $d->error, 500);
    $types = '';
    foreach ($params as $p) $types .= is_int($p) ? 'i' : (is_float($p) ? 'd' : 's');
    $stmt->bind_param($types, ...$params);
    if (!$stmt->execute()) json_err('DB: ' . $stmt->error, 500);
    $res = $stmt->get_result();
    $rows = array();
    while ($r = $res->fetch_assoc()) $rows[] = $r;
    return $rows;
}

function one($sql, $params = array()) {
    $rows = q($sql, $params);
    return $rows ? $rows[0] : null;
}

/** INSERT/UPDATE/DELETE — возвращает insert_id */
function run($sql, $params = array()) {
    $d = db();
    if (empty($params)) {
        if (!$d->query($sql)) json_err('DB: ' . $d->error, 500);
        return $d->insert_id;
    }
    $stmt = $d->prepare($sql);
    if (!$stmt) json_err('DB prepare: ' . $d->error, 500);
    $types = '';
    foreach ($params as $p) $types .= is_int($p) ? 'i' : (is_float($p) ? 'd' : 's');
    $stmt->bind_param($types, ...$params);
    if (!$stmt->execute()) json_err('DB: ' . $stmt->error, 500);
    return $stmt->insert_id;
}

/* ---------- JSON ---------- */
function json_out($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function json_err($msg, $code = 400) {
    json_out(array('ok' => false, 'error' => $msg), $code);
}
function json_ok($data = array()) {
    $data['ok'] = true;
    json_out($data);
}
function read_body() {
    $raw = file_get_contents('php://input');
    $b = json_decode($raw, true);
    return is_array($b) ? $b : array();
}

/* ---------- Сессии и авторизация ---------- */
function start_session() {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params(array('httponly' => true, 'samesite' => 'Lax'));
        session_start();
    }
}
function current_user() {
    start_session();
    if (empty($_SESSION['user_id'])) return null;
    return one("SELECT * FROM kgn_users WHERE id = ?", array((int)$_SESSION['user_id']));
}
function require_auth($role = null) {
    $u = current_user();
    if (!$u) json_err('Требуется вход', 401);
    if ($role && $u['role'] !== $role) json_err('Недостаточно прав', 403);
    return $u;
}
function require_student() {
    $u = require_auth('student');
    $sid = isset($_SESSION['student_id']) ? (int)$_SESSION['student_id'] : 0;
    if (!$sid) json_err('Профиль ученика не найден', 404);
    return array('user' => $u, 'student_id' => $sid);
}

/* ---------- Настройки ---------- */
function get_setting($key, $default) {
    $r = one("SELECT sval FROM kgn_settings WHERE skey = ?", array($key));
    return $r ? $r['sval'] : $default;
}
function set_setting($key, $val) {
    run("INSERT INTO kgn_settings (skey, sval) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE sval = ?", array($key, (string)$val, (string)$val));
}

/* ---------- Геймификация ---------- */
function stars_per_day($streak) {
    $s = max(1, $streak);
    return intdiv($s - 1, 7) + 1;
}
/** Начислить очки, день занятий, звёзды, (опц.) счётчик логики */
function award_student($studentId, $points, $isLogic) {
    $st = one("SELECT * FROM kgn_students WHERE id = ?", array($studentId));
    if (!$st) return;
    $today = date('Y-m-d');
    $days = $st['study_days'] ? json_decode($st['study_days'], true) : array();
    if (!is_array($days)) $days = array();
    $stars = (int)$st['stars'];
    $streak = (int)$st['streak'];
    if (!in_array($today, $days)) {
        $days[] = $today;
        sort($days);
        $streak = 1;
        $cursor = strtotime($today);
        while (in_array(date('Y-m-d', strtotime('-1 day', $cursor)), $days)) {
            $streak++;
            $cursor = strtotime('-1 day', $cursor);
        }
        $stars += stars_per_day($streak);
    }
    $newPoints = (int)$st['points'] + $points;
    if ($isLogic) {
        $used = ($st['logic_day'] === $today) ? (int)$st['logic_count'] : 0;
        run("UPDATE kgn_students SET points=?, stars=?, streak=?, study_days=?, logic_day=?, logic_count=? WHERE id=?",
            array($newPoints, $stars, $streak, json_encode($days), $today, $used + 1, $studentId));
    } else {
        run("UPDATE kgn_students SET points=?, stars=?, streak=?, study_days=? WHERE id=?",
            array($newPoints, $stars, $streak, json_encode($days), $studentId));
    }
}

/* ---------- Конвертеры в формат фронтенда ---------- */
function get_full_student($studentId) {
    $r = one("SELECT * FROM kgn_students WHERE id = ?", array($studentId));
    if (!$r) return null;
    $now = time() * 1000;
    $acc = array();
    foreach (q("SELECT c.slug, a.expires_at FROM kgn_access a JOIN kgn_courses c ON c.id=a.course_id WHERE a.student_id=?", array($studentId)) as $a) {
        $acc[$a['slug']] = strtotime($a['expires_at']) * 1000;
    }
    $purchased = array();
    foreach ($acc as $slug => $exp) if ($exp > $now) $purchased[] = $slug;
    $done = array();
    foreach (q("SELECT l.slug FROM kgn_progress p JOIN kgn_lessons l ON l.id=p.lesson_id WHERE p.student_id=?", array($studentId)) as $d) {
        $done[] = $d['slug'];
    }
    $u = one("SELECT suspended FROM kgn_users WHERE student_id = ?", array($studentId));
    return array(
        'id' => (string)$r['id'],
        'name' => $r['name'],
        'age' => (int)$r['age'],
        'group' => $r['grp'],
        'color' => $r['color'],
        'purchased' => $purchased,
        'done' => $done,
        'points' => (int)$r['points'],
        'streak' => (int)$r['streak'],
        'registeredAt' => strtotime($r['created_at']) * 1000,
        'accessUntil' => $acc,
        'phone' => $r['phone'],
        'email' => $r['email'],
        'suspended' => $u ? (bool)(int)$u['suspended'] : false,
        'studyDays' => $r['study_days'] ? json_decode($r['study_days'], true) : array(),
        'stars' => (int)$r['stars'],
        'logicDay' => $r['logic_day'],
        'logicCount' => (int)$r['logic_count'],
    );
}

function all_courses_frontend() {
    $lessonsByCourse = array();
    foreach (q("SELECT * FROM kgn_lessons ORDER BY course_id, sort_order") as $l) {
        $lessonsByCourse[$l['course_id']][] = $l;
    }
    $courses = array();
    foreach (q("SELECT * FROM kgn_courses ORDER BY id") as $c) {
        $lessons = array();
        foreach ((isset($lessonsByCourse[$c['id']]) ? $lessonsByCourse[$c['id']] : array()) as $l) {
            $lessons[] = array(
                'id' => $l['slug'],
                'title' => $l['title'],
                'kind' => $l['kind'],
                'minutes' => (int)$l['minutes'],
                'trainer' => $l['trainer'],
            );
        }
        $courses[] = array(
            'id' => $c['slug'],
            'directionId' => $c['direction'],
            'title' => $c['title'],
            'subtitle' => $c['subtitle'],
            'level' => (int)$c['lvl'],
            'age' => $c['age'],
            'price' => (int)$c['price'],
            'validityMonths' => (int)$c['validity_months'],
            'published' => (bool)(int)$c['published'],
            'lessons' => $lessons,
        );
    }
    return $courses;
}

function all_promotions_frontend() {
    $courseIdToSlug = array();
    foreach (q("SELECT id, slug FROM kgn_courses") as $c) $courseIdToSlug[$c['id']] = $c['slug'];
    $pcByPromo = array();
    foreach (q("SELECT promotion_id, course_id FROM kgn_promotion_courses") as $r) {
        $slug = isset($courseIdToSlug[$r['course_id']]) ? $courseIdToSlug[$r['course_id']] : null;
        if ($slug) $pcByPromo[$r['promotion_id']][] = $slug;
    }
    $promos = array();
    foreach (q("SELECT * FROM kgn_promotions ORDER BY id") as $p) {
        $promos[] = array(
            'id' => (string)$p['id'],
            'title' => $p['title'],
            'active' => (bool)(int)$p['active'],
            'courseIds' => isset($pcByPromo[$p['id']]) ? $pcByPromo[$p['id']] : array(),
            'directionId' => $p['direction'],
            'discountType' => $p['discount_type'],
            'discountValue' => (int)$p['discount_value'],
        );
    }
    return $promos;
}

function all_students_frontend() {
    $now = time() * 1000;
    $accessByStudent = array();
    foreach (q("SELECT a.student_id, c.slug, a.expires_at FROM kgn_access a JOIN kgn_courses c ON c.id=a.course_id") as $r) {
        $accessByStudent[$r['student_id']][$r['slug']] = strtotime($r['expires_at']) * 1000;
    }
    $doneByStudent = array();
    foreach (q("SELECT p.student_id, l.slug FROM kgn_progress p JOIN kgn_lessons l ON l.id=p.lesson_id") as $r) {
        $doneByStudent[$r['student_id']][] = $r['slug'];
    }
    $suspByStudent = array();
    foreach (q("SELECT student_id, suspended FROM kgn_users WHERE student_id IS NOT NULL") as $r) {
        $suspByStudent[$r['student_id']] = (bool)(int)$r['suspended'];
    }
    $students = array();
    foreach (q("SELECT * FROM kgn_students ORDER BY id") as $r) {
        $sid = (int)$r['id'];
        $acc = isset($accessByStudent[$sid]) ? $accessByStudent[$sid] : array();
        $purchased = array();
        foreach ($acc as $slug => $exp) if ($exp > $now) $purchased[] = $slug;
        $students[] = array(
            'id' => (string)$sid,
            'name' => $r['name'],
            'age' => (int)$r['age'],
            'group' => $r['grp'],
            'color' => $r['color'],
            'purchased' => $purchased,
            'done' => isset($doneByStudent[$sid]) ? $doneByStudent[$sid] : array(),
            'points' => (int)$r['points'],
            'streak' => (int)$r['streak'],
            'registeredAt' => strtotime($r['created_at']) * 1000,
            'accessUntil' => $acc,
            'phone' => $r['phone'],
            'email' => $r['email'],
            'suspended' => isset($suspByStudent[$sid]) ? $suspByStudent[$sid] : false,
            'studyDays' => $r['study_days'] ? json_decode($r['study_days'], true) : array(),
            'stars' => (int)$r['stars'],
            'logicDay' => $r['logic_day'],
            'logicCount' => (int)$r['logic_count'],
        );
    }
    return $students;
}
