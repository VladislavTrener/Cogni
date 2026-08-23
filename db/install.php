<?php
/**
 * Kognitiv.Pro installer - SELF-CONTAINED.
 * The database schema is embedded below, so only two files are needed
 * on the server: config.php and install.php. No phpMyAdmin import required.
 *
 * Usage:
 *   1. Fill in config.php (DB credentials from the hosting panel).
 *   2. Upload config.php + install.php to the site root.
 *   3. Open http://YOUR-DOMAIN/install.php
 *   4. Delete both files from the server afterwards.
 *
 * Idempotent: safe to run multiple times.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
header('Content-Type: text/plain; charset=utf-8');

echo "=== Kognitiv.Pro installer ===\n";
echo 'PHP version: ' . PHP_VERSION . "\n\n";

function fail($msg)
{
    echo "\n[!!] " . $msg . "\n";
    exit(1);
}

if (!is_file(__DIR__ . '/config.php')) {
    fail('config.php not found next to install.php. Create it (see db/config.php in the project).');
}
require __DIR__ . '/config.php';
if (!defined('DB_HOST') || !defined('DB_NAME') || !defined('DB_USER') || !defined('DB_PASS')) {
    fail('config.php is incomplete or corrupted. Re-create it manually in the file manager.');
}

$m = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($m->connect_errno) {
    fail('Cannot connect to database: ' . $m->connect_error);
}
$m->set_charset('utf8mb4');
echo '[OK] Connected to database "' . DB_NAME . "\"\n\n";

/* ================= embedded schema (pure ASCII) ================= */

$SCHEMA_SQL = <<<'SQL'
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS kgn_users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(120) NOT NULL UNIQUE,
  pass_hash VARCHAR(255) NOT NULL,
  role ENUM('student','teacher','admin') NOT NULL DEFAULT 'student',
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(120) NULL,
  suspended TINYINT(1) NOT NULL DEFAULT 0,
  student_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kgn_students (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  name VARCHAR(120) NOT NULL,
  age TINYINT UNSIGNED NOT NULL DEFAULT 9,
  grp CHAR(1) NOT NULL DEFAULT 'A',
  color VARCHAR(10) NOT NULL DEFAULT '#2fa8dc',
  points INT NOT NULL DEFAULT 0,
  stars INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 0,
  study_days TEXT NULL,
  logic_day DATE NULL,
  logic_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  trial_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_students_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kgn_courses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(60) NOT NULL UNIQUE,
  direction ENUM('count','memory','logic','general','mental') NOT NULL,
  title VARCHAR(160) NOT NULL,
  subtitle VARCHAR(500) NOT NULL DEFAULT '',
  lvl TINYINT UNSIGNED NOT NULL DEFAULT 1,
  age VARCHAR(20) NOT NULL DEFAULT '7-10',
  price INT UNSIGNED NOT NULL DEFAULT 0,
  validity_months TINYINT UNSIGNED NOT NULL DEFAULT 3,
  published TINYINT(1) NOT NULL DEFAULT 1,
  INDEX idx_courses_dir (direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kgn_lessons (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  slug VARCHAR(60) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  title VARCHAR(160) NOT NULL,
  kind ENUM('trainer','video','test') NOT NULL DEFAULT 'trainer',
  minutes TINYINT UNSIGNED NOT NULL DEFAULT 10,
  trainer VARCHAR(40) NULL,
  UNIQUE KEY uq_lesson_slug (course_id, slug),
  INDEX idx_lessons_course (course_id),
  CONSTRAINT fk_lessons_course FOREIGN KEY (course_id) REFERENCES kgn_courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kgn_progress (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  lesson_id INT UNSIGNED NOT NULL,
  completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  points_awarded INT NOT NULL DEFAULT 20,
  UNIQUE KEY uq_progress (student_id, lesson_id),
  INDEX idx_progress_student (student_id),
  CONSTRAINT fk_progress_student FOREIGN KEY (student_id) REFERENCES kgn_students(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_lesson FOREIGN KEY (lesson_id) REFERENCES kgn_lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kgn_access (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_access (student_id, course_id),
  INDEX idx_access_student (student_id),
  CONSTRAINT fk_access_student FOREIGN KEY (student_id) REFERENCES kgn_students(id) ON DELETE CASCADE,
  CONSTRAINT fk_access_course FOREIGN KEY (course_id) REFERENCES kgn_courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kgn_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  item VARCHAR(255) NOT NULL,
  purpose VARCHAR(255) NOT NULL,
  amount INT UNSIGNED NOT NULL,
  method VARCHAR(30) NOT NULL DEFAULT 'SBP',
  status ENUM('paid','pending','refunded') NOT NULL DEFAULT 'paid',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payments_student (student_id),
  CONSTRAINT fk_payments_student FOREIGN KEY (student_id) REFERENCES kgn_students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kgn_promotions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  direction ENUM('count','memory','logic','general','mental') NULL,
  discount_type ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  discount_value INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kgn_promotion_courses (
  promotion_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (promotion_id, course_id),
  CONSTRAINT fk_pc_promo FOREIGN KEY (promotion_id) REFERENCES kgn_promotions(id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_course FOREIGN KEY (course_id) REFERENCES kgn_courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kgn_settings (
  skey VARCHAR(60) PRIMARY KEY,
  sval VARCHAR(500) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kgn_login_attempts (
  login VARCHAR(120) PRIMARY KEY,
  fails TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO kgn_settings (skey, sval) VALUES ('demo_days', '3')
  ON DUPLICATE KEY UPDATE skey = skey;
INSERT INTO kgn_settings (skey, sval) VALUES ('logic_daily_limit', '3')
  ON DUPLICATE KEY UPDATE skey = skey;
SQL;

/* ================= 1. tables ================= */

$res = $m->query("SHOW TABLES LIKE 'kgn_users'");
if ($res && $res->num_rows > 0) {
    echo "[OK] Tables already exist (schema step skipped)\n";
} else {
    echo "[..] Creating tables from embedded schema...\n";
    if (!$m->multi_query($SCHEMA_SQL)) {
        fail('Schema error: ' . $m->error);
    }
    do {
        if ($r = $m->store_result()) {
            $r->free();
        }
    } while ($m->more_results() && $m->next_result());
    if ($m->errno) {
        fail('Schema import error: ' . $m->error);
    }
    $cnt = (int) $m->query('SHOW TABLES')->num_rows;
    echo "[OK] Tables created: $cnt\n";
}

/* ================= helpers ================= */

function courseId($m, $slug)
{
    $stmt = $m->prepare('SELECT id FROM kgn_courses WHERE slug = ?');
    $stmt->bind_param('s', $slug);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    return $row ? (int) $row['id'] : 0;
}

function hasLessons($m, $cid)
{
    $stmt = $m->prepare('SELECT COUNT(*) c FROM kgn_lessons WHERE course_id = ?');
    $stmt->bind_param('i', $cid);
    $stmt->execute();
    return (int) $stmt->get_result()->fetch_assoc()['c'] > 0;
}

function addLesson($m, $cid, $slug, $sort, $title, $kind, $minutes, $trainer)
{
    $stmt = $m->prepare(
        'INSERT INTO kgn_lessons (course_id, slug, sort_order, title, kind, minutes, trainer)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('isisiss', $cid, $slug, $sort, $title, $kind, $minutes, $trainer);
    $stmt->execute();
}

/* ================= 2. courses ================= */

$COURSES = array(
    array('c-count-mult',  'count',  1, '6-9',   1500, 3, 'Тренировка умножения', 'Умный тренажёр с интервальными повторениями: 5 коробок Лейтнера, живая карта таблицы и постепенное открытие столбиков'),
    array('c-count-quest', 'count',  2, '8-11',  2200, 3, 'Космическая тетрадь: умножение в задачах', 'Квест на 100 текстовых задач по 4 планетам — кулинария, игры, путешествия и магазин со сдачей. Ошибки повторяются, полёт сохраняется'),
    array('c-count-add',   'count',  1, '6-9',   1900, 3, 'Тренировка сложения', 'Счёт до 20 с ростом сложности, умные интервальные повторы и космолёт на двузначных числах — всё на коробках Лейтнера'),
    array('c-count-sub10', 'count',  1, '6-8',   1500, 3, 'Вычитание от 10', 'Все случаи вычитания из 10 — с цифрами от 0 до 9. Ошибка сразу показывает верный ответ, в конце блока — кнопка «Повторить»'),
    array('c-count-sub20', 'count',  1, '7-9',   1500, 3, 'Вычитание от 20', 'Все случаи вычитания из 20 — с цифрами от 0 до 20. Ошибка показывает ответ, блок повторяется до уверенности'),
    array('c-count-mix20', 'count',  2, '7-10',  1700, 3, 'Сложение и вычитание до 20', 'Смешанные примеры: сложение и вычитание с числами до 20 вперемешку. Тренирует переключение между операциями'),
    array('c-mem-nback',   'memory', 2, '9-13',  2100, 3, 'N-back: тренажёр рабочей памяти', 'Классический N-back: клетки вспыхивают на поле 3x3, нужно сравнивать с показом N шагов назад. Сложность растёт от N-1 до N-2'),
    array('c-mem-seq',     'memory', 1, '7-11',  1900, 3, 'Запомни последовательность', 'Квадраты мигают по очереди — повтори порядок. Поле растёт от 4x4 до 6x6, длина последовательности — до 10'),
    array('c-mem-stroop',  'memory', 2, '9-13',  1900, 3, 'Тест Струпа: таблицы внимания', 'Семь блоков от 4x4 до 10x10. В каждом — три таблицы: чёрная, разноцветная и красно-чёрная Горбова. Цифры перемешиваются при каждой попытке'),
    array('c-logic-kids',  'logic',  1, '5-8',   1900, 3, 'Логика малышам: 150 задач', '150 логических задач для дошкольников и 1 класса: 6 типов — умозаключения, анаграммы, сравнения, классификация, отношения, антонимы. С озвучкой'),
    array('c-logic-school','logic',  2, '8-11',  2200, 3, 'Логика 2-4 класс: 235 задач', '235 задач в 24 смешанных блоках по 10 задач: 10 типов — от умозаключений до цветных таблиц. Сложность растёт от блока к блоку'),
    array('c-logic-46',    'logic',  3, '10-13', 2400, 3, 'Логика 4-6 класс: 235 задач', '235 задач повышенной сложности в 24 смешанных блоках: цепочки из 3-4 условий, четырёхзначные числа, отвлекающие персонажи'),
);

$created = 0;
foreach ($COURSES as $c) {
    list($slug, $dir, $lvl, $age, $price, $months, $title, $subtitle) = $c;
    $stmt = $m->prepare('SELECT id FROM kgn_courses WHERE slug = ?');
    $stmt->bind_param('s', $slug);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        continue;
    }
    $stmt = $m->prepare(
        'INSERT INTO kgn_courses (slug, direction, lvl, age, price, validity_months, published, title, subtitle)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)'
    );
    $stmt->bind_param('ssisisss', $slug, $dir, $lvl, $age, $price, $months, $title, $subtitle);
    $stmt->execute();
    $created++;
}
$total = (int) $m->query('SELECT COUNT(*) c FROM kgn_courses')->fetch_assoc()['c'];
echo "[OK] Courses: $total in database" . ($created ? " (+$created created)" : '') . "\n";

/* ================= 3. accounts ================= */

$ACCOUNTS = array(
    array('admin',    'Администратор', 'admin',   '1234567890'),
    array('school',   'School',        'admin',   '1234567890'),
    array('bichurin', 'Бичурин В. А.', 'teacher', '1234567890'),
);
foreach ($ACCOUNTS as $a) {
    list($login, $name, $role, $pass) = $a;
    $stmt = $m->prepare('SELECT id FROM kgn_users WHERE login = ?');
    $stmt->bind_param('s', $login);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        echo "[OK] Account \"$login\" already exists\n";
        continue;
    }
    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $stmt = $m->prepare('INSERT INTO kgn_users (login, pass_hash, role, name) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('ssss', $login, $hash, $role, $name);
    $stmt->execute();
    echo "[OK] Account created: $login / $pass ($name)\n";
}

/* ================= 4. lessons ================= */

$EXPLICIT = array(
    'c-count-mult' => array(
        array('ls-mult-1', 'Умный тренажёр: интервалы', 'trainer', 15, 'multLeitner'),
        array('ls-mult-2', 'Тетрадь в клетку: верно / неверно', 'trainer', 12, 'multNotebook'),
        array('ls-mult-3', 'Космополёт: столбики x2-x11', 'trainer', 12, 'multCosmos'),
    ),
    'c-count-quest' => array(
        array('ls-quest-1', 'Космический квест: 100 задач', 'trainer', 45, 'quest'),
    ),
    'c-count-add' => array(
        array('ls-add-1', 'Счёт до 20: разгон', 'trainer', 12, 'addCount'),
        array('ls-add-2', 'Умные интервалы', 'trainer', 12, 'addSmart'),
        array('ls-add-3', 'Космолёт: двузначные', 'trainer', 12, 'addCosmos'),
    ),
    'c-count-sub10' => array(array('ls-sub10-1', 'Вычитание от 10: все цифры', 'trainer', 10, 'sub10')),
    'c-count-sub20' => array(array('ls-sub20-1', 'Вычитание от 20: все цифры', 'trainer', 10, 'sub20')),
    'c-count-mix20' => array(array('ls-mix20-1', 'Микс: сложение и вычитание до 20', 'trainer', 12, 'mix20')),
    'c-mem-nback'   => array(array('ls-nback-1', 'N-1 и N-2: рост сложности', 'trainer', 12, 'nback')),
    'c-mem-seq'     => array(array('ls-seq-1', 'Мигающие квадраты: 4x4 - 6x6', 'trainer', 12, 'sequence')),
    'c-mem-stroop'  => array(array('ls-stroop-1', 'Блоки 4x4 - 10x10: три таблицы', 'trainer', 15, 'stroop')),
);

foreach ($EXPLICIT as $slug => $lessons) {
    $cid = courseId($m, $slug);
    if (!$cid) {
        echo "[!!] Course \"$slug\" not found - skipped\n";
        continue;
    }
    if (hasLessons($m, $cid)) {
        echo "[OK] Lessons for \"$slug\" already exist\n";
        continue;
    }
    $i = 0;
    foreach ($lessons as $l) {
        $i++;
        addLesson($m, $cid, $l[0], $i, $l[1], $l[2], $l[3], $l[4]);
    }
    echo '[OK] "' . $slug . '": ' . count($lessons) . " lessons added\n";
}

/* Logic for kids: 6 types + big test */
$KIDS = array(
    array('lk1', 'Умозаключения'),
    array('lk2', 'Переставь буквы'),
    array('lk3', 'Кто больше?'),
    array('lk4', 'Что подходит?'),
    array('lk5', 'Семья и отношения'),
    array('lk6', 'Слова-наоборот'),
);
$cid = courseId($m, 'c-logic-kids');
if ($cid && !hasLessons($m, $cid)) {
    foreach ($KIDS as $i => $t) {
        addLesson($m, $cid, $t[0], $i + 1, $t[1], 'trainer', 10, $t[0]);
    }
    addLesson($m, $cid, 'lkMix', 7, 'Большой тест: 20 задач вперемешку', 'test', 12, 'lkMix');
    echo "[OK] \"c-logic-kids\": 7 lessons added\n";
} elseif ($cid) {
    echo "[OK] Lessons for \"c-logic-kids\" already exist\n";
}

/* School logic courses: blocks of 10 + big test */
$BLOCKS = array(
    array('c-logic-school', 'slb', 'slMix', 235),
    array('c-logic-46', 'g46b', 'g46Mix', 235),
);
foreach ($BLOCKS as $bc) {
    list($slug, $prefix, $mixSlug, $totalTasks) = $bc;
    $cid = courseId($m, $slug);
    if (!$cid) {
        echo "[!!] Course \"$slug\" not found - skipped\n";
        continue;
    }
    if (hasLessons($m, $cid)) {
        echo "[OK] Lessons for \"$slug\" already exist\n";
        continue;
    }
    $blockSize = 10;
    $blocks = (int) ceil($totalTasks / $blockSize);
    for ($b = 1; $b <= $blocks; $b++) {
        $from = ($b - 1) * $blockSize + 1;
        $to = min($b * $blockSize, $totalTasks);
        addLesson($m, $cid, $prefix . $b, $b, 'Блок ' . $b . ' - задачи ' . $from . '-' . $to, 'trainer', 8, $prefix . $b);
    }
    addLesson($m, $cid, $mixSlug, $blocks + 1, 'Большой тест: 20 задач вперемешку', 'test', 12, $mixSlug);
    echo '[OK] "' . $slug . '": ' . ($blocks + 1) . " lessons added ($blocks blocks + test)\n";
}

/* ================= 5. promos ================= */

$PROMOS = array(
    array('Всё направление «СЧЁТ»', 'count', 'percent', 20, array()),
    array('Умножение + Сложение', null, 'fixed', 2900, array('c-count-mult', 'c-count-add')),
);
foreach ($PROMOS as $p) {
    list($title, $dir, $type, $value, $slugs) = $p;
    $stmt = $m->prepare('SELECT id FROM kgn_promotions WHERE title = ?');
    $stmt->bind_param('s', $title);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        echo "[OK] Promo \"$title\" already exists\n";
        continue;
    }
    $stmt = $m->prepare(
        'INSERT INTO kgn_promotions (title, active, direction, discount_type, discount_value) VALUES (?, 1, ?, ?, ?)'
    );
    $stmt->bind_param('sssi', $title, $dir, $type, $value);
    $stmt->execute();
    $pid = (int) $m->insert_id;
    foreach ($slugs as $slug) {
        $cid = courseId($m, $slug);
        if ($cid) {
            $stmt = $m->prepare('INSERT INTO kgn_promotion_courses (promotion_id, course_id) VALUES (?, ?)');
            $stmt->bind_param('ii', $pid, $cid);
            $stmt->execute();
        }
    }
    echo "[OK] Promo created: \"$title\"\n";
}

/* ================= summary ================= */

$courses = (int) $m->query('SELECT COUNT(*) c FROM kgn_courses')->fetch_assoc()['c'];
$lessons = (int) $m->query('SELECT COUNT(*) c FROM kgn_lessons')->fetch_assoc()['c'];
$users   = (int) $m->query('SELECT COUNT(*) c FROM kgn_users')->fetch_assoc()['c'];
$promos  = (int) $m->query('SELECT COUNT(*) c FROM kgn_promotions')->fetch_assoc()['c'];
$tables  = (int) $m->query('SHOW TABLES')->num_rows;

echo "\n=== DONE ===\n";
echo "Tables: $tables | Courses: $courses | Lessons: $lessons | Accounts: $users | Promos: $promos\n\n";
echo "!!! NOW DELETE install.php AND config.php FROM THE SERVER !!!\n";
echo "    They contain database credentials and must not be public.\n";
