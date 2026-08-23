-- =============================================================
-- Kognitiv.Pro - database structure (MySQL 8 / MariaDB)
-- PURE ASCII FILE - safe for phpMyAdmin import.
-- All Russian content (courses, lessons, accounts, promos)
-- is created by install.php, not by this file.
-- =============================================================

SET NAMES utf8mb4;

-- Users: students, teachers, admins
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

-- Student profiles (game data)
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

-- Courses
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

-- Lessons
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

-- Progress: completed lessons
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

-- Access: paid course access with expiration
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

-- Payments
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

-- Promos
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

-- Platform settings
CREATE TABLE IF NOT EXISTS kgn_settings (
  skey VARCHAR(60) PRIMARY KEY,
  sval VARCHAR(500) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login brute-force protection
CREATE TABLE IF NOT EXISTS kgn_login_attempts (
  login VARCHAR(120) PRIMARY KEY,
  fails TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default settings (numbers only - encoding-safe)
INSERT INTO kgn_settings (skey, sval) VALUES ('demo_days', '3')
  ON DUPLICATE KEY UPDATE skey = skey;
INSERT INTO kgn_settings (skey, sval) VALUES ('logic_daily_limit', '3')
  ON DUPLICATE KEY UPDATE skey = skey;
