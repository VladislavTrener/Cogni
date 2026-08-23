<?php
// ============================================================
// Kognitiv.Pro - one-time installer (courses, lessons, accounts, promos)
// Compatible with PHP 5.5 .. 8.x. Prints all errors as text
// (never fails silently with HTTP 500).
//
// HOW TO USE:
//   1. Upload config.php and install.php to the site root folder.
//   2. Open http://YOUR-DOMAIN/install.php in a browser.
//   3. After success DELETE both files from the server!
//
// The script is idempotent: running it twice duplicates nothing.
// ============================================================

error_reporting(E_ALL);
ini_set('display_errors', '1');

echo '<meta charset="utf-8"><pre style="font:14px/1.6 Consolas,monospace;padding:20px;background:#fff;color:#152420">';
echo "=== Kognitiv.Pro installer ===\n";
echo "PHP version: " . PHP_VERSION . "\n\n";

// ---------- config ----------
$config = __DIR__ . '/config.php';
if (!is_file($config)) {
    echo "[!!] config.php not found next to install.php.\n";
    echo "     Upload db/config.php into the same folder first.\n";
    echo "</pre>";
    exit;
}
require $config;

if (!defined('DB_HOST') || !defined('DB_USER') || !defined('DB_PASS') || !defined('DB_NAME')) {
    echo "[!!] config.php loaded, but DB_HOST / DB_USER / DB_PASS / DB_NAME are missing.\n";
    echo "     Most likely the file was corrupted while downloading.\n";
    echo "     Re-save config.php in UTF-8 so it starts exactly with &lt;?php\n";
    echo "</pre>";
    exit;
}

$mysqli = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($mysqli->connect_errno) {
    echo "[!!] Cannot connect to the database: " . $mysqli->connect_error . "\n";
    echo "     Check DB_HOST / DB_USER / DB_PASS / DB_NAME in config.php\n";
    echo "     (sprinthost panel -> MySQL databases).\n";
    echo "</pre>";
    exit;
}
$mysqli->set_charset('utf8mb4');
echo "[OK] Connected to database \"" . DB_NAME . "\"\n\n";

// ---------- helpers ----------
function kq($m, $s)
{
    return "'" . $m->real_escape_string($s) . "'";
}

function kcourseId($m, $slug)
{
    $r = $m->query("SELECT id FROM kgn_courses WHERE slug = " . kq($m, $slug));
    if (!$r) return 0;
    $row = $r->fetch_assoc();
    return $row ? (int)$row['id'] : 0;
}

function kcourseExists($m, $slug)
{
    return kcourseId($m, $slug) > 0;
}

function kuserExists($m, $login)
{
    $r = $m->query("SELECT id FROM kgn_users WHERE login = " . kq($m, $login));
    return $r && $r->num_rows > 0;
}

function kpromoExists($m, $title)
{
    $r = $m->query("SELECT id FROM kgn_promotions WHERE title = " . kq($m, $title));
    return $r && $r->num_rows > 0;
}

function khasLessons($m, $courseId)
{
    $r = $m->query("SELECT COUNT(*) AS c FROM kgn_lessons WHERE course_id = " . (int)$courseId);
    $row = $r->fetch_assoc();
    return (int)$row['c'] > 0;
}

function kaddLesson($m, $courseId, $slug, $sort, $title, $kind, $minutes, $trainer)
{
    $m->query(
        "INSERT INTO kgn_lessons (course_id, slug, sort_order, title, kind, minutes, trainer) VALUES (" .
        (int)$courseId . ", " . kq($m, $slug) . ", " . (int)$sort . ", " . kq($m, $title) . ", " .
        kq($m, $kind) . ", " . (int)$minutes . ", " . kq($m, $trainer) . ")"
    );
    if ($m->errno) {
        echo "[!!] lesson insert error: " . $m->error . "\n";
    }
}

// ---------- 1. tables ----------
$t = $mysqli->query("SHOW TABLES LIKE 'kgn_users'");
if ($t && $t->num_rows > 0) {
    echo "[OK] Tables already exist (skipping schema.sql)\n";
} else {
    $schemaFile = __DIR__ . '/schema.sql';
    if (!is_file($schemaFile)) {
        echo "[!!] No tables in the database and schema.sql is missing.\n";
        echo "     Import schema.sql via phpMyAdmin first, then run this script again.\n";
        echo "</pre>";
        exit;
    }
    $sql = file_get_contents($schemaFile);
    if (!$mysqli->multi_query($sql)) {
        echo "[!!] schema.sql import failed: " . $mysqli->error . "\n";
        echo "</pre>";
        exit;
    }
    do {
        if ($res = $mysqli->store_result()) {
            $res->free();
        }
    } while ($mysqli->more_results() && $mysqli->next_result());
    if ($mysqli->errno) {
        echo "[!!] schema.sql import error: " . $mysqli->error . "\n";
        echo "</pre>";
        exit;
    }
    echo "[OK] schema.sql imported - 11 tables created\n";
}

// ---------- 2. courses ----------
// slug, direction, title, price (validity = 3 months for all)
$courses = array(
    array('c-count-mult',   'count',  'Тренировка умножения', 1500),
    array('c-count-quest',  'count',  'Космическая тетрадь: умножение в задачах', 2200),
    array('c-count-add',    'count',  'Тренировка сложения', 1900),
    array('c-count-sub10',  'count',  'Вычитание от 10', 1500),
    array('c-count-sub20',  'count',  'Вычитание от 20', 1500),
    array('c-count-mix20',  'count',  'Сложение и вычитание до 20', 1700),
    array('c-mem-nback',    'memory', 'N-back: тренажёр рабочей памяти', 2100),
    array('c-mem-seq',      'memory', 'Запомни последовательность', 1900),
    array('c-mem-stroop',   'memory', 'Тест Струпа: таблицы внимания', 1900),
    array('c-logic-kids',   'logic',  'Логика малышам: 150 задач', 1900),
    array('c-logic-school', 'logic',  'Логика 2-4 класс: 235 задач', 2400),
    array('c-logic-46',     'logic',  'Логика 4-6 класс: 235 задач', 2600)
);

echo "\n--- Courses ---\n";
$createdCourses = 0;
foreach ($courses as $c) {
    $slug = $c[0];
    $dir = $c[1];
    $title = $c[2];
    $price = (int)$c[3];
    if (kcourseExists($mysqli, $slug)) {
        continue;
    }
    $mysqli->query(
        "INSERT INTO kgn_courses (slug, direction, title, price, validity_months, published) VALUES (" .
        kq($mysqli, $slug) . ", " . kq($mysqli, $dir) . ", " . kq($mysqli, $title) . ", " .
        $price . ", 3, 1)"
    );
    if ($mysqli->errno) {
        echo "[!!] course \"$slug\" error: " . $mysqli->error . "\n";
    } else {
        $createdCourses++;
    }
}
echo $createdCourses > 0 ? "[OK] Courses created: $createdCourses\n" : "[OK] Courses already exist (12 expected)\n";

// ---------- 3. accounts ----------
echo "\n--- Accounts ---\n";
$accounts = array(
    array('admin',    'Администратор', 'admin'),
    array('school',   'School',        'admin'),
    array('bichurin', 'Бичурин В. А.', 'teacher')
);
foreach ($accounts as $a) {
    $login = $a[0];
    $name = $a[1];
    $role = $a[2];
    if (kuserExists($mysqli, $login)) {
        echo "[OK] Account \"$login\" already exists\n";
        continue;
    }
    $hash = password_hash('1234567890', PASSWORD_DEFAULT);
    $mysqli->query(
        "INSERT INTO kgn_users (login, pass_hash, role, name) VALUES (" .
        kq($mysqli, $login) . ", " . kq($mysqli, $hash) . ", " . kq($mysqli, $role) . ", " . kq($mysqli, $name) . ")"
    );
    if ($mysqli->errno) {
        echo "[!!] account \"$login\" error: " . $mysqli->error . "\n";
    } else {
        echo "[OK] Account created: $login / 1234567890  ($name)\n";
    }
}

// ---------- 4. lessons ----------
echo "\n--- Lessons ---\n";

// Explicit lesson lists: slug => array of (slug, title, kind, minutes, trainer)
$explicit = array(
    'c-count-mult' => array(
        array('ls-mult-1', 'Умный тренажёр: интервалы', 'trainer', 15, 'multLeitner'),
        array('ls-mult-2', 'Тетрадь в клетку: верно / неверно', 'trainer', 12, 'multNotebook'),
        array('ls-mult-3', 'Космополёт: столбики ×2–×11', 'trainer', 12, 'multCosmos')
    ),
    'c-count-quest' => array(
        array('ls-quest-1', 'Космический квест: 100 задач', 'trainer', 45, 'quest')
    ),
    'c-count-add' => array(
        array('ls-add-1', 'Счёт до 20: разгон', 'trainer', 12, 'addCount'),
        array('ls-add-2', 'Умные интервалы', 'trainer', 12, 'addSmart'),
        array('ls-add-3', 'Космолёт: двузначные', 'trainer', 12, 'addCosmos')
    ),
    'c-count-sub10' => array(
        array('ls-sub10-1', 'Вычитание от 10: все цифры', 'trainer', 10, 'sub10')
    ),
    'c-count-sub20' => array(
        array('ls-sub20-1', 'Вычитание от 20: все цифры', 'trainer', 10, 'sub20')
    ),
    'c-count-mix20' => array(
        array('ls-mix20-1', 'Микс: сложение и вычитание до 20', 'trainer', 12, 'mix20')
    ),
    'c-mem-nback' => array(
        array('ls-nback-1', 'N-1 и N-2: рост сложности', 'trainer', 12, 'nback')
    ),
    'c-mem-seq' => array(
        array('ls-seq-1', 'Мигающие квадраты: 4×4 → 6×6', 'trainer', 12, 'sequence')
    ),
    'c-mem-stroop' => array(
        array('ls-stroop-1', 'Блоки 4×4 → 10×10: три таблицы', 'trainer', 15, 'stroop')
    )
);

foreach ($explicit as $slug => $lessons) {
    $cid = kcourseId($mysqli, $slug);
    if ($cid === 0) {
        echo "[!!] course \"$slug\" not found - skipped\n";
        continue;
    }
    if (khasLessons($mysqli, $cid)) {
        echo "[OK] \"$slug\": lessons already exist\n";
        continue;
    }
    $i = 0;
    foreach ($lessons as $l) {
        $i++;
        kaddLesson($mysqli, $cid, $l[0], $i, $l[1], $l[2], $l[3], $l[4]);
    }
    echo "[OK] \"$slug\": lessons added - " . count($lessons) . "\n";
}

// Logic for little ones: 6 task types + big test
$kidsTypes = array(
    array('lk1', 'Умозаключения'),
    array('lk2', 'Переставь буквы'),
    array('lk3', 'Кто больше?'),
    array('lk4', 'Что подходит?'),
    array('lk5', 'Семья и отношения'),
    array('lk6', 'Слова-наоборот')
);
$cid = kcourseId($mysqli, 'c-logic-kids');
if ($cid > 0 && !khasLessons($mysqli, $cid)) {
    $i = 0;
    foreach ($kidsTypes as $kt) {
        $i++;
        kaddLesson($mysqli, $cid, $kt[0], $i, $kt[1], 'trainer', 10, $kt[0]);
    }
    kaddLesson($mysqli, $cid, 'lkMix', 7, 'Большой тест: 20 задач вперемешку', 'test', 12, 'lkMix');
    echo "[OK] \"c-logic-kids\": lessons added - 7\n";
} elseif ($cid > 0) {
    echo "[OK] \"c-logic-kids\": lessons already exist\n";
}

// School logic courses: blocks of 10 tasks + big test
$blockCourses = array(
    array('c-logic-school', 'slb', 'slMix', 235),
    array('c-logic-46', 'g46b', 'g46Mix', 235)
);
foreach ($blockCourses as $bc) {
    $slug = $bc[0];
    $prefix = $bc[1];
    $mixSlug = $bc[2];
    $total = (int)$bc[3];
    $cid = kcourseId($mysqli, $slug);
    if ($cid === 0) {
        echo "[!!] course \"$slug\" not found - skipped\n";
        continue;
    }
    if (khasLessons($mysqli, $cid)) {
        echo "[OK] \"$slug\": lessons already exist\n";
        continue;
    }
    $blockSize = 10;
    $blocks = (int)ceil($total / $blockSize);
    for ($b = 1; $b <= $blocks; $b++) {
        $from = ($b - 1) * $blockSize + 1;
        $to = min($b * $blockSize, $total);
        kaddLesson($mysqli, $cid, $prefix . $b, $b, "Блок $b · задачи $from–$to", 'trainer', 8, $prefix . $b);
    }
    kaddLesson($mysqli, $cid, $mixSlug, $blocks + 1, 'Большой тест: 20 задач вперемешку', 'test', 12, $mixSlug);
    echo "[OK] \"$slug\": lessons added - " . ($blocks + 1) . " ($blocks blocks + test)\n";
}

// ---------- 5. promos ----------
echo "\n--- Promotions ---\n";
if (!kpromoExists($mysqli, 'Всё направление «СЧЁТ»')) {
    $mysqli->query(
        "INSERT INTO kgn_promotions (title, active, direction, discount_type, discount_value) VALUES (" .
        kq($mysqli, 'Всё направление «СЧЁТ»') . ", 1, 'count', 'percent', 20)"
    );
    echo $mysqli->errno ? "[!!] promo 1 error: " . $mysqli->error . "\n" : "[OK] Promo: Всё направление «СЧЁТ» (-20%)\n";
} else {
    echo "[OK] Promo 1 already exists\n";
}

if (!kpromoExists($mysqli, 'Умножение + Сложение')) {
    $mysqli->query(
        "INSERT INTO kgn_promotions (title, active, direction, discount_type, discount_value) VALUES (" .
        kq($mysqli, 'Умножение + Сложение') . ", 1, NULL, 'fixed', 2900)"
    );
    if ($mysqli->errno) {
        echo "[!!] promo 2 error: " . $mysqli->error . "\n";
    } else {
        $r = $mysqli->query("SELECT id FROM kgn_promotions WHERE title = " . kq($mysqli, 'Умножение + Сложение'));
        $promoId = (int)$r->fetch_assoc()['id'];
        foreach (array('c-count-mult', 'c-count-add') as $cs) {
            $courseId = kcourseId($mysqli, $cs);
            if ($courseId > 0) {
                $mysqli->query("INSERT IGNORE INTO kgn_promotion_courses (promotion_id, course_id) VALUES ($promoId, $courseId)");
            }
        }
        echo "[OK] Promo: Умножение + Сложение (2900 руб.)\n";
    }
} else {
    echo "[OK] Promo 2 already exists\n";
}

// ---------- summary ----------
$cnt = function ($table) use ($mysqli) {
    $r = $mysqli->query("SELECT COUNT(*) AS c FROM " . $table);
    return (int)$r->fetch_assoc()['c'];
};

echo "\n=== DONE ===\n";
echo "Courses: " . $cnt('kgn_courses') . "  |  Lessons: " . $cnt('kgn_lessons') .
     "  |  Accounts: " . $cnt('kgn_users') . "  |  Promos: " . $cnt('kgn_promotions') . "\n\n";
echo "!!! NOW DELETE install.php AND config.php FROM THE SERVER !!!\n";
echo "    They contain database credentials and must not be public.\n";
echo "</pre>";
