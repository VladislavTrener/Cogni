-- ============================================================
--  Когнитив.Про — схема базы данных (MySQL 8 / MariaDB)
--  Импортируется через phpMyAdmin: вкладка «Импорт» → выбрать файл
--  Перед импортом создайте пустую базу в панели хостинга и
--  выберите её в phpMyAdmin (слева).
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. Аккаунты (вход): ученики, преподаватель, администраторы
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kgn_users` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `login`      VARCHAR(190) NOT NULL,
  `pass_hash`  VARCHAR(255) NOT NULL,
  `role`       ENUM('student','teacher','admin') NOT NULL DEFAULT 'student',
  `name`       VARCHAR(120) NOT NULL,
  `student_id` INT UNSIGNED NULL,
  `suspended`  TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_login` (`login`),
  KEY `ix_users_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Профили учеников
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kgn_students` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(120) NOT NULL,
  `age`          TINYINT UNSIGNED NOT NULL DEFAULT 9,
  `group_name`   VARCHAR(20) NOT NULL DEFAULT 'А',
  `color`        VARCHAR(12) NOT NULL DEFAULT '#2fa8dc',
  `phone`        VARCHAR(30) NOT NULL DEFAULT '',
  `email`        VARCHAR(190) NOT NULL,
  `points`       INT NOT NULL DEFAULT 0,
  `stars`        INT NOT NULL DEFAULT 0,
  `streak`       INT NOT NULL DEFAULT 0,
  `study_days`   JSON NULL,
  `logic_day`    DATE NULL,
  `logic_count`  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `trial_until`  DATE NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_students_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Курсы (цены и публикации редактирует администратор)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kgn_courses` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`            VARCHAR(40) NOT NULL,
  `direction`       ENUM('count','memory','logic','general','mental') NOT NULL,
  `title`           VARCHAR(200) NOT NULL,
  `subtitle`        TEXT NULL,
  `level`           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `age_label`       VARCHAR(40) NOT NULL DEFAULT '',
  `price`           INT UNSIGNED NOT NULL DEFAULT 0,
  `validity_months` TINYINT UNSIGNED NOT NULL DEFAULT 3,
  `published`       TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_courses_slug` (`slug`),
  KEY `ix_courses_direction` (`direction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Уроки курсов
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kgn_lessons` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `course_id`  INT UNSIGNED NOT NULL,
  `slug`       VARCHAR(60) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `title`      VARCHAR(200) NOT NULL,
  `kind`       ENUM('trainer','video','test') NOT NULL DEFAULT 'trainer',
  `minutes`    SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  `trainer`    VARCHAR(40) NULL,
  `note`       TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lessons_course_slug` (`course_id`, `slug`),
  CONSTRAINT `fk_lessons_course` FOREIGN KEY (`course_id`)
    REFERENCES `kgn_courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. Прогресс: кто какой урок прошёл
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kgn_progress` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`   INT UNSIGNED NOT NULL,
  `lesson_id`    INT UNSIGNED NOT NULL,
  `completed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_progress` (`student_id`, `lesson_id`),
  CONSTRAINT `fk_progress_student` FOREIGN KEY (`student_id`)
    REFERENCES `kgn_students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_progress_lesson` FOREIGN KEY (`lesson_id`)
    REFERENCES `kgn_lessons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. Доступ к курсам (покупки со сроком действия)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kgn_access` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`   INT UNSIGNED NOT NULL,
  `course_id`    INT UNSIGNED NOT NULL,
  `bought_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `access_until` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_access` (`student_id`, `course_id`),
  CONSTRAINT `fk_access_student` FOREIGN KEY (`student_id`)
    REFERENCES `kgn_students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_access_course` FOREIGN KEY (`course_id`)
    REFERENCES `kgn_courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. Платежи
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kgn_payments` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` INT UNSIGNED NOT NULL,
  `item`       VARCHAR(200) NOT NULL,
  `purpose`    VARCHAR(255) NOT NULL,
  `amount`     INT UNSIGNED NOT NULL DEFAULT 0,
  `method`     VARCHAR(40) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_payments_student` (`student_id`),
  CONSTRAINT `fk_payments_student` FOREIGN KEY (`student_id`)
    REFERENCES `kgn_students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. Акции
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kgn_promotions` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`          VARCHAR(200) NOT NULL,
  `active`         TINYINT(1) NOT NULL DEFAULT 1,
  `scope`          ENUM('courses','direction') NOT NULL DEFAULT 'courses',
  `direction`      VARCHAR(20) NULL,
  `discount_type`  ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  `discount_value` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. Состав акций (какие курсы входят)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kgn_promotion_courses` (
  `promotion_id` INT UNSIGNED NOT NULL,
  `course_id`    INT UNSIGNED NOT NULL,
  PRIMARY KEY (`promotion_id`, `course_id`),
  CONSTRAINT `fk_pc_promotion` FOREIGN KEY (`promotion_id`)
    REFERENCES `kgn_promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pc_course` FOREIGN KEY (`course_id`)
    REFERENCES `kgn_courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 10. Настройки (демо-период, QR-код оплаты и т.п.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kgn_settings` (
  `skey`   VARCHAR(60) NOT NULL,
  `svalue` TEXT NULL,
  PRIMARY KEY (`skey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 11. Защита входа: счётчик неудачных попыток и блокировка
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kgn_login_attempts` (
  `login`        VARCHAR(190) NOT NULL,
  `fails`        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `locked_until` DATETIME NULL,
  PRIMARY KEY (`login`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  Начальные данные: курсы и настройки
-- ============================================================

INSERT INTO `kgn_courses` (`slug`, `direction`, `title`, `subtitle`, `level`, `age_label`, `price`, `validity_months`, `published`) VALUES
('c-count-mult',  'count',  'Тренировка умножения', 'Три тренажёра на одном движке: интервальные коробки Лейтнера, Тетрадь в клетку и Космополёт — таблица умножения доводится до автоматизма', 1, '8–11 лет', 1500, 3, 1),
('c-count-quest', 'count',  'Космическая тетрадь: умножение в задачах', 'Квест на 100 текстовых задач по 4 планетам — кулинария, игры, путешествия и магазин со сдачей. Ошибки повторяются, полёт сохраняется', 2, '8–11 лет', 2200, 3, 1),
('c-count-add',   'count',  'Тренировка сложения', 'Счёт до 20 с ростом сложности, умные интервальные повторы и космолёт на двузначных числах — всё на коробках Лейтнера', 1, '6–9 лет', 1900, 3, 1),
('c-count-sub10', 'count',  'Вычитание от 10', 'Все случаи вычитания из 10 — с цифрами от 0 до 9. Ошибка сразу показывает верный ответ, в конце блока — кнопка Повторить', 1, '6–8 лет', 1500, 3, 1),
('c-count-sub20', 'count',  'Вычитание от 20', 'Все случаи вычитания из 20 — с цифрами от 0 до 20. Ошибка показывает ответ, блок повторяется до уверенности', 1, '7–9 лет', 1500, 3, 1),
('c-count-mix20', 'count',  'Сложение и вычитание до 20', 'Смешанные примеры: сложение и вычитание с числами до 20 вперемешку. Тренирует переключение между операциями', 2, '7–10 лет', 1700, 3, 1),
('c-mem-nback',   'memory', 'N-back: тренажёр рабочей памяти', 'Классический N-back: сравнивай клетку с той, что была N показов назад. Сложность растёт от N-1 до N-2', 2, '9–13 лет', 2100, 3, 1),
('c-mem-seq',     'memory', 'Запомни последовательность', 'Мигающие квадраты: поля 4×4, 5×5 и 6×6, последовательности от 1 до 10. Вторая попытка — повторный просмотр', 1, '8–12 лет', 1900, 3, 1),
('c-mem-stroop',  'memory', 'Тест Струпа: таблицы внимания', 'Семь блоков от 4×4 до 10×10. В каждом — три таблицы: чёрная, разноцветная и красно-чёрная Горбова', 2, '9–13 лет', 1900, 3, 1),
('c-logic-kids',  'logic',  'Логика малышам: 150 задач', 'Для дошкольников и 1 класса. 150 задач шестью типами, озвучиваются голосом. Разбор ошибок после раунда', 1, '5–8 лет', 1900, 3, 1),
('c-logic-school','logic',  'Логика 2-4 класс: 235 задач', 'Для школьников. 235 задач десятью типами, смешанные блоки по 10 задач, озвучка голосом', 2, '8–11 лет', 2300, 3, 1),
('c-logic-46',    'logic',  'Логика 4-6 класс', 'Для школьников постарше. 235 задач десятью типами — анаграммы из 5 букв, семейные цепочки, или-или с тремя условиями', 3, '10–13 лет', 2300, 3, 1);

INSERT INTO `kgn_settings` (`skey`, `svalue`) VALUES
('trial_days', '3'),
('payment_qr', ''),
('daily_logic_limit', '3');
