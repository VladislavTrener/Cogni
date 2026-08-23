<?php
/**
 * POST /api/admin/action.php  { action, ... }  — только для роли admin
 *   suspend        { studentId }
 *   set_password   { accountId, password }
 *   delete_user    { studentId }
 *   save_course    { slug, price, published, validityMonths }
 *   save_promo     { id?, title, courseIds, directionId, discountType, discountValue, active }
 *   delete_promo   { id }
 *   toggle_promo   { id }
 *   save_settings  { trialDays, logicLimit }
 *   extend_access  { studentId, days }
 */
require __DIR__ . '/../lib.php';

$body = read_body();
$action = isset($body['action']) ? $body['action'] : '';
require_auth('admin');

switch ($action) {

    case 'suspend': {
        $sid = (int)(isset($body['studentId']) ? $body['studentId'] : 0);
        if (!$sid) json_err('Не указан ученик', 400);
        $u = one("SELECT id, suspended FROM kgn_users WHERE student_id = ?", array($sid));
        if (!$u) json_err('Аккаунт не найден', 404);
        $new = 1 - (int)$u['suspended'];
        run("UPDATE kgn_users SET suspended = ? WHERE id = ?", array($new, (int)$u['id']));
        json_ok(array('suspended' => (bool)$new, 'student' => get_full_student($sid)));
    }

    case 'set_password': {
        $aid = (int)(isset($body['accountId']) ? $body['accountId'] : 0);
        $pass = isset($body['password']) ? $body['password'] : '';
        if (!$aid || strlen($pass) < 6) json_err('Пароль должен быть не короче 6 символов', 400);
        $hash = password_hash($pass, PASSWORD_DEFAULT);
        run("UPDATE kgn_users SET pass_hash = ? WHERE id = ?", array($hash, $aid));
        // смена пароля снимает блокировку входа
        $u = one("SELECT login FROM kgn_users WHERE id = ?", array($aid));
        if ($u) run("DELETE FROM kgn_login_attempts WHERE login = ?", array($u['login']));
        json_ok(array());
    }

    case 'delete_user': {
        $sid = (int)(isset($body['studentId']) ? $body['studentId'] : 0);
        if (!$sid) json_err('Не указан ученик', 400);
        run("DELETE FROM kgn_users WHERE student_id = ?", array($sid));
        run("DELETE FROM kgn_students WHERE id = ?", array($sid)); // прогресс/доступ/платежи удалятся по CASCADE
        json_ok(array());
    }

    case 'save_course': {
        $slug = isset($body['slug']) ? $body['slug'] : '';
        if (!$slug) json_err('Не указан курс', 400);
        $c = one("SELECT id FROM kgn_courses WHERE slug = ?", array($slug));
        if (!$c) json_err('Курс не найден', 404);
        $price = (int)(isset($body['price']) ? $body['price'] : 0);
        $published = isset($body['published']) ? (int)(bool)$body['published'] : 1;
        $vm = (int)(isset($body['validityMonths']) ? $body['validityMonths'] : 3);
        run("UPDATE kgn_courses SET price=?, published=?, validity_months=? WHERE id=?",
            array($price, $published, $vm, (int)$c['id']));
        json_ok(array('courses' => all_courses_frontend()));
    }

    case 'save_promo': {
        $title = trim(isset($body['title']) ? $body['title'] : '');
        if ($title === '') json_err('Укажите название акции', 400);
        $courseIds = isset($body['courseIds']) && is_array($body['courseIds']) ? $body['courseIds'] : array();
        $directionId = !empty($body['directionId']) ? $body['directionId'] : null;
        $dtype = isset($body['discountType']) ? $body['discountType'] : 'percent';
        $dval = (int)(isset($body['discountValue']) ? $body['discountValue'] : 0);
        $active = isset($body['active']) ? (int)(bool)$body['active'] : 1;

        if (!empty($body['id'])) {
            $pid = (int)$body['id'];
            run("UPDATE kgn_promotions SET title=?, direction=?, discount_type=?, discount_value=?, active=? WHERE id=?",
                array($title, $directionId, $dtype, $dval, $active, $pid));
        } else {
            $pid = run("INSERT INTO kgn_promotions (title, direction, discount_type, discount_value, active) VALUES (?,?,?,?,?)",
                array($title, $directionId, $dtype, $dval, $active));
        }
        // синхронизация состава
        run("DELETE FROM kgn_promotion_courses WHERE promotion_id = ?", array($pid));
        foreach ($courseIds as $slug) {
            $c = one("SELECT id FROM kgn_courses WHERE slug = ?", array($slug));
            if ($c) run("INSERT INTO kgn_promotion_courses (promotion_id, course_id) VALUES (?,?)",
                array($pid, (int)$c['id']));
        }
        json_ok(array('promotions' => all_promotions_frontend()));
    }

    case 'delete_promo': {
        $pid = (int)(isset($body['id']) ? $body['id'] : 0);
        if ($pid) run("DELETE FROM kgn_promotions WHERE id = ?", array($pid));
        json_ok(array('promotions' => all_promotions_frontend()));
    }

    case 'toggle_promo': {
        $pid = (int)(isset($body['id']) ? $body['id'] : 0);
        if ($pid) run("UPDATE kgn_promotions SET active = 1 - active WHERE id = ?", array($pid));
        json_ok(array('promotions' => all_promotions_frontend()));
    }

    case 'save_settings': {
        if (isset($body['trialDays'])) set_setting('demo_days', (int)$body['trialDays']);
        if (isset($body['logicLimit'])) set_setting('logic_daily_limit', (int)$body['logicLimit']);
        json_ok(array('settings' => array(
            'trialDays' => (int)get_setting('demo_days', 3),
            'qr' => is_file(__DIR__ . '/../qr.png') ? '/api/qr.png' : (is_file(__DIR__ . '/qr.png') ? '/api/qr.png' : null),
        )));
    }

    case 'extend_access': {
        $sid = (int)(isset($body['studentId']) ? $body['studentId'] : 0);
        $days = (int)(isset($body['days']) ? $body['days'] : 30);
        if (!$sid) json_err('Не указан ученик', 400);
        run("UPDATE kgn_access SET expires_at = DATE_ADD(expires_at, INTERVAL ? DAY) WHERE student_id = ?",
            array($days, $sid));
        json_ok(array('student' => get_full_student($sid)));
    }
}

json_err('Неизвестное действие', 400);
