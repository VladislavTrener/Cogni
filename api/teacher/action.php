<?php
/**
 * POST /api/teacher/action.php  { action, ... }  — для ролей teacher и admin
 *   set_lesson  { studentId, lessonSlug, done }  — отметить/снять отметку урока
 *   award       { studentId, points }            — начислить очки
 */
require __DIR__ . '/../lib.php';

$body = read_body();
$action = isset($body['action']) ? $body['action'] : '';
$u = require_auth();
if ($u['role'] !== 'teacher' && $u['role'] !== 'admin') json_err('Недостаточно прав', 403);

if ($action === 'set_lesson') {
    $sid = (int)(isset($body['studentId']) ? $body['studentId'] : 0);
    $lessonSlug = isset($body['lessonSlug']) ? $body['lessonSlug'] : '';
    $done = isset($body['done']) ? (bool)$body['done'] : false;
    if (!$sid || $lessonSlug === '') json_err('Не указаны данные', 400);
    $lesson = one("SELECT id FROM kgn_lessons WHERE slug = ?", array($lessonSlug));
    if (!$lesson) json_err('Урок не найден', 404);
    if ($done) {
        run("INSERT IGNORE INTO kgn_progress (student_id, lesson_id, points_awarded) VALUES (?,?,0)",
            array($sid, (int)$lesson['id']));
    } else {
        run("DELETE FROM kgn_progress WHERE student_id=? AND lesson_id=?",
            array($sid, (int)$lesson['id']));
    }
    json_ok(array('student' => get_full_student($sid)));
}

if ($action === 'award') {
    $sid = (int)(isset($body['studentId']) ? $body['studentId'] : 0);
    $points = (int)(isset($body['points']) ? $body['points'] : 0);
    if (!$sid || $points === 0) json_err('Не указаны данные', 400);
    run("UPDATE kgn_students SET points = points + ? WHERE id = ?", array($points, $sid));
    json_ok(array('student' => get_full_student($sid)));
}

json_err('Неизвестное действие', 400);
