<?php
/**
 * POST /api/student/action.php  { action, ... }
 *   action=complete  { lessonSlug }          — отметить урок пройденным
 *   action=purchase  { courseSlugs, amount, item, purpose, method } — покупка (выдача доступа)
 */
require __DIR__ . '/../lib.php';

$body = read_body();
$action = isset($body['action']) ? $body['action'] : '';
$auth = require_student();
$studentId = $auth['student_id'];

if ($action === 'complete') {
    $lessonSlug = isset($body['lessonSlug']) ? $body['lessonSlug'] : '';
    $lesson = one(
        "SELECT l.id, c.direction FROM kgn_lessons l JOIN kgn_courses c ON c.id=l.course_id WHERE l.slug = ?",
        array($lessonSlug));
    if (!$lesson) json_err('Урок не найден', 404);

    $existing = one("SELECT id FROM kgn_progress WHERE student_id=? AND lesson_id=?",
        array($studentId, (int)$lesson['id']));
    if ($existing) {
        json_ok(array('already' => true, 'student' => get_full_student($studentId)));
    }

    // дневной лимит блоков логики
    if ($lesson['direction'] === 'logic') {
        $st = one("SELECT logic_day, logic_count FROM kgn_students WHERE id=?", array($studentId));
        $today = date('Y-m-d');
        $used = ($st['logic_day'] === $today) ? (int)$st['logic_count'] : 0;
        $limit = (int)get_setting('logic_daily_limit', 3);
        if ($used >= $limit) json_err('Дневной лимит блоков логики исчерпан — приходите завтра', 429);
    }

    $points = 20;
    run("INSERT INTO kgn_progress (student_id, lesson_id, points_awarded) VALUES (?,?,?)",
        array($studentId, (int)$lesson['id'], $points));
    award_student($studentId, $points, $lesson['direction'] === 'logic');

    json_ok(array('already' => false, 'student' => get_full_student($studentId)));
}

if ($action === 'purchase') {
    $courseSlugs = isset($body['courseSlugs']) && is_array($body['courseSlugs']) ? $body['courseSlugs'] : array();
    $amount  = (int)(isset($body['amount']) ? $body['amount'] : 0);
    $item    = isset($body['item']) ? $body['item'] : '';
    $purpose = isset($body['purpose']) ? $body['purpose'] : '';
    $method  = isset($body['method']) ? $body['method'] : 'Карта';
    if (empty($courseSlugs)) json_err('Не указаны курсы', 400);

    foreach ($courseSlugs as $slug) {
        $c = one("SELECT id, validity_months FROM kgn_courses WHERE slug = ?", array($slug));
        if (!$c) continue;
        $months = (int)$c['validity_months'];
        // продление от текущего окончания (если доступ ещё действует) или от сегодня
        run("INSERT INTO kgn_access (student_id, course_id, expires_at)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MONTH))
             ON DUPLICATE KEY UPDATE expires_at = DATE_ADD(GREATEST(NOW(), expires_at), INTERVAL ? MONTH)",
            array($studentId, (int)$c['id'], $months, $months));
    }
    run("INSERT INTO kgn_payments (student_id, item, purpose, amount, method) VALUES (?,?,?,?,?)",
        array($studentId, $item, $purpose, $amount, $method));

    json_ok(array('student' => get_full_student($studentId)));
}

json_err('Неизвестное действие', 400);
