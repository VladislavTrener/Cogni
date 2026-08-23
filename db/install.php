<?php
/**
 * Когнитив.Про — разовый установочный скрипт.
 *
 * Что делает:
 *  1. Если таблиц ещё нет — накатывает schema.sql (импорт можно сделать и
 *     вручную через phpMyAdmin, скрипт сам поймёт, что база уже готова).
 *  2. Создаёт служебные аккаунты: admin, school, bichurin (пароль 1234567890).
 *  3. Создаёт уроки всех курсов (включая блоки курсов логики).
 *
 * Как пользоваться:
 *  1. Отредактируйте config.php (данные из панели sprinthost).
 *  2. Загрузите db/config.php и db/install.php в public_html вашего хоста.
 *  3. Откройте https://ВАШ-ДОМЕН/install.php
 *  4. После успеха ОБЯЗАТЕЛЬНО удалите install.php и config.php с хоста.
 *
 * Скрипт идемпотентен: повторный запуск ничего не дублирует.
 */

header('Content-Type: text/html; charset=utf-8');
echo '<meta charset="utf-8"><pre style="font:14px/1.6 Consolas,monospace;padding:20px">';

require __DIR__ . '/config.php';

$mysqli = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($mysqli->connect_errno) {
    exit("✗ Не удалось подключиться к базе: " . $mysqli->connect_error .
         "\nПроверьте данные в config.php (панель sprinthost → Базы данных MySQL).");
}
$mysqli->set_charset('utf8mb4');
echo "✓ Подключение к базе «" . DB_NAME . "» установлено\n\n";

/* ---------- 1. Таблицы ---------- */
$tables = $mysqli->query("SHOW TABLES LIKE 'kgn_users'");
if ($tables && $tables->num_rows > 0) {
    echo "✓ Таблицы уже созданы (пропускаю schema.sql)\n";
} else {
    $schemaFile = __DIR__ . '/schema.sql';
    if (!is_file($schemaFile)) {
        exit("✗ Файл schema.sql не найден рядом с install.php.\n" .
             "Либо загрузите его, либо импортируйте вручную через phpMyAdmin и запустите скрипт снова.");
    }
    $sql = file_get_contents($schemaFile);
    if (!$mysqli->multi_query($sql)) {
        exit("✗ Ошибка импорта schema.sql: " . $mysqli->error);
    }
    do {
        if ($res = $mysqli->store_result()) { $res->free(); }
    } while ($mysqli->more_results() && $mysqli->next_result());
    if ($mysqli->errno) exit("✗ Ошибка при импорте: " . $mysqli->error);
    echo "✓ schema.sql импортирован — 11 таблиц создано\n";
}

/* ---------- 2. Служебные аккаунты ---------- */
$accounts = [
    ['admin',    'Администратор', 'admin',   '1234567890'],
    ['school',   'School',        'admin',   '1234567890'],
    ['bichurin', 'Бичурин В. А.', 'teacher', '1234567890'],
];
foreach ($accounts as [$login, $name, $role, $pass]) {
    $stmt = $mysqli->prepare("SELECT id FROM kgn_users WHERE login = ?");
    $stmt->bind_param('s', $login);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        echo "✓ Аккаунт «$login» уже существует\n";
        continue;
    }
    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $stmt = $mysqli->prepare("INSERT INTO kgn_users (login, pass_hash, role, name) VALUES (?, ?, ?, ?)");
    $stmt->bind_param('ssss', $login, $hash, $role, $name);
    $stmt->execute();
    echo "✓ Создан аккаунт: $login / $pass  ($name)\n";
}

/* ---------- 3. Уроки курсов ---------- */
$courseId = function (string $slug) use ($mysqli): int {
    $stmt = $mysqli->prepare("SELECT id FROM kgn_courses WHERE slug = ?");
    $stmt->bind_param('s', $slug);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    return $row ? (int)$row['id'] : 0;
};
$hasLessons = function (int $cid) use ($mysqli): bool {
    $stmt = $mysqli->prepare("SELECT COUNT(*) c FROM kgn_lessons WHERE course_id = ?");
    $stmt->bind_param('i', $cid);
    $stmt->execute();
    return (int)$stmt->get_result()->fetch_assoc()['c'] > 0;
};
$addLesson = function (int $cid, string $slug, int $sort, string $title, string $kind, int $minutes, ?string $trainer) use ($mysqli) {
    $stmt = $mysqli->prepare(
        "INSERT INTO kgn_lessons (course_id, slug, sort_order, title, kind, minutes, trainer)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param('isisiss', $cid, $slug, $sort, $title, $kind, $minutes, $trainer);
    $stmt->execute();
};

$explicit = [
    'c-count-mult' => [
        ['ls-mult-1', 'Умный тренажёр: интервалы', 'trainer', 15, 'multLeitner'],
        ['ls-mult-2', 'Тетрадь в клетку: верно / неверно', 'trainer', 12, 'multNotebook'],
        ['ls-mult-3', 'Космополёт: столбики ×2–×11', 'trainer', 12, 'multCosmos'],
    ],
    'c-count-quest' => [
        ['ls-quest-1', 'Космический квест: 100 задач', 'trainer', 45, 'quest'],
    ],
    'c-count-add' => [
        ['ls-add-1', 'Счёт до 20: разгон', 'trainer', 12, 'addCount'],
        ['ls-add-2', 'Умные интервалы', 'trainer', 12, 'addSmart'],
        ['ls-add-3', 'Космолёт: двузначные', 'trainer', 12, 'addCosmos'],
    ],
    'c-count-sub10' => [['ls-sub10-1', 'Вычитание от 10: все цифры', 'trainer', 10, 'sub10']],
    'c-count-sub20' => [['ls-sub20-1', 'Вычитание от 20: все цифры', 'trainer', 10, 'sub20']],
    'c-count-mix20' => [['ls-mix20-1', 'Микс: сложение и вычитание до 20', 'trainer', 12, 'mix20']],
    'c-mem-nback'   => [['ls-nback-1', 'N-1 и N-2: рост сложности', 'trainer', 12, 'nback']],
    'c-mem-seq'     => [['ls-seq-1', 'Мигающие квадраты: 4×4 → 6×6', 'trainer', 12, 'sequence']],
    'c-mem-stroop'  => [['ls-stroop-1', 'Блоки 4×4 → 10×10: три таблицы', 'trainer', 15, 'stroop']],
];
foreach ($explicit as $slug => $lessons) {
    $cid = $courseId($slug);
    if (!$cid) { echo "✗ Курс «$slug» не найден в базе — пропущен\n"; continue; }
    if ($hasLessons($cid)) { echo "✓ Уроки курса «$slug» уже есть\n"; continue; }
    foreach ($lessons as $i => [$lslug, $title, $kind, $minutes, $trainer]) {
        $addLesson($cid, $lslug, $i + 1, $title, $kind, $minutes, $trainer);
    }
    echo "✓ Курс «$slug»: добавлено уроков — " . count($lessons) . "\n";
}

/* Логика малышам: 6 типов задач + большой тест */
$kidsTypes = [
    ['lk1', 'Умозаключения'],
    ['lk2', 'Переставь буквы'],
    ['lk3', 'Кто больше?'],
    ['lk4', 'Что подходит?'],
    ['lk5', 'Семья и отношения'],
    ['lk6', 'Слова-наоборот'],
];
$cid = $courseId('c-logic-kids');
if ($cid && !$hasLessons($cid)) {
    foreach ($kidsTypes as $i => [$slug, $title]) {
        $addLesson($cid, $slug, $i + 1, $title, 'trainer', 10, $slug);
    }
    $addLesson($cid, 'lkMix', 7, 'Большой тест: 20 задач вперемешку', 'test', 12, 'lkMix');
    echo "✓ Курс «c-logic-kids»: добавлено уроков — 7\n";
} elseif ($cid) { echo "✓ Уроки курса «c-logic-kids» уже есть\n"; }

/* Школьные курсы логики: блоки по 10 задач + большой тест */
$blockCourses = [
    ['c-logic-school', 'slb', 'slMix', 235],
    ['c-logic-46', 'g46b', 'g46Mix', 235],
];
foreach ($blockCourses as [$slug, $prefix, $mixSlug, $total]) {
    $cid = $courseId($slug);
    if (!$cid) { echo "✗ Курс «$slug» не найден в базе — пропущен\n"; continue; }
    if ($hasLessons($cid)) { echo "✓ Уроки курса «$slug» уже есть\n"; continue; }
    $blockSize = 10;
    $blocks = (int)ceil($total / $blockSize);
    for ($b = 1; $b <= $blocks; $b++) {
        $from = ($b - 1) * $blockSize + 1;
        $to = min($b * $blockSize, $total);
        $addLesson($cid, $prefix . $b, $b, "Блок $b · задачи $from–$to", 'trainer', 8, $prefix . $b);
    }
    $addLesson($cid, $mixSlug, $blocks + 1, 'Большой тест: 20 задач вперемешку', 'test', 12, $mixSlug);
    echo "✓ Курс «$slug»: добавлено уроков — " . ($blocks + 1) . " ($blocks блоков + тест)\n";
}

/* ---------- итог ---------- */
$courses = (int)$mysqli->query("SELECT COUNT(*) c FROM kgn_courses")->fetch_assoc()['c'];
$lessons = (int)$mysqli->query("SELECT COUNT(*) c FROM kgn_lessons")->fetch_assoc()['c'];
$users   = (int)$mysqli->query("SELECT COUNT(*) c FROM kgn_users")->fetch_assoc()['c'];
echo "\n=== ГОТОВО ===\n";
echo "Курсов: $courses · Уроков: $lessons · Аккаунтов: $users\n\n";
echo "⚠ СЕЙЧАС УДАЛИТЕ С ХОСТА ФАЙЛЫ install.php И config.php!\n";
echo "  Они содержат доступ к базе и не должны быть доступны из интернета.\n";
echo '</pre>';
