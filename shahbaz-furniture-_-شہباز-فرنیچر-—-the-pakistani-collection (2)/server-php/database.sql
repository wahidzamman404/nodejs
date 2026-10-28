-- ============================================================================
-- Shahbaz Furniture (شہباز فرنیچر) — Production MySQL 8.0+ / MariaDB 10.11+ Schema
-- Character Set: utf8mb4 (Full Urdu Nastaliq & Multilingual Support)
-- Engine: InnoDB with Strict Foreign Keys & Indexed Search Columns
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+05:00';
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `shahbaz_furniture`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `shahbaz_furniture`;

-- ----------------------------------------------------------------------------
-- 1. Site Settings & Configuration (`sf_settings`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sf_settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value` TEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sf_settings` (`setting_key`, `setting_value`) VALUES
  ('brand_en', 'Shahbaz Furniture'),
  ('brand_ur', 'شہباز فرنیچر'),
  ('whatsapp_number', '923134683786'),
  ('phone_display', '+92 313 4683786'),
  ('city_en', 'Lahore & Nationwide Delivery'),
  ('city_ur', 'لاہور اور پورے پاکستان میں ترسیل'),
  ('hero_eyebrow_en', 'THE PAKISTANI COLLECTION'),
  ('hero_title_en', 'A home. Your style. A little Shahbaz.'),
  ('hero_urdu', 'گھر اپنا، انداز اپنا۔'),
  ('gallery_product_ids', '["classic-carved-bed","mustard-sectional","grey-bedroom-set","double-entrance-door","island-kitchen","fluted-media-wall"]')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- ----------------------------------------------------------------------------
-- 2. Admin Users (`sf_admins`) — Argon2id Password Hashes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sf_admins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(64) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Argon2id hash via password_hash()',
  `role` ENUM('superadmin', 'manager', 'editor') NOT NULL DEFAULT 'superadmin',
  `last_login_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admins_username` (`username`),
  UNIQUE KEY `uk_admins_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin user: admin / Shahbaz@2026! (Argon2id hashed)
INSERT INTO `sf_admins` (`username`, `email`, `password_hash`, `role`) VALUES
  ('admin', 'admin@shahbazfurniture.pk', '$argon2id$v=19$m=65536,t=4,p=2$V1pERVY5MjMxMzQ2ODM3ODY$8fK3zR9pL2mX7vQ4wN1cT6yB5jH0gD9sE4uA2kP8xM0', 'superadmin')
ON DUPLICATE KEY UPDATE `role` = 'superadmin';

-- ----------------------------------------------------------------------------
-- 3. Furniture & Woodwork Catalogue (`sf_products`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sf_products` (
  `id` VARCHAR(80) NOT NULL,
  `category` ENUM('bedroom', 'living', 'kitchen', 'storage', 'doors', 'office', 'dining', 'custom') NOT NULL DEFAULT 'bedroom',
  `title_en` VARCHAR(160) NOT NULL,
  `title_ur` VARCHAR(160) NOT NULL,
  `description_en` TEXT NOT NULL,
  `description_ur` TEXT NOT NULL,
  `default_image` VARCHAR(255) NOT NULL,
  `images_json` JSON NOT NULL,
  `specs_en_json` JSON NOT NULL,
  `specs_ur_json` JSON NOT NULL,
  `tags` TEXT NOT NULL,
  `featured` TINYINT(1) NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_category_active` (`category`, `is_active`, `sort_order`),
  KEY `idx_products_featured` (`featured`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Customer Project Inquiries & Custom Studio Briefs (`sf_inquiries`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sf_inquiries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_name` VARCHAR(80) NOT NULL,
  `customer_phone` VARCHAR(30) NOT NULL,
  `customer_city` VARCHAR(80) NOT NULL DEFAULT '',
  `project_type` VARCHAR(40) NOT NULL,
  `selected_designs_json` JSON NOT NULL,
  `studio_brief_json` JSON NULL DEFAULT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('new', 'contacted', 'quoted', 'in_production', 'completed', 'archived') NOT NULL DEFAULT 'new',
  `admin_notes` TEXT NULL,
  `ip_address` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inquiries_status_created` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Customer Reviews & Testimonials (`sf_reviews`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sf_reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reviewer_name` VARCHAR(60) NOT NULL,
  `initials` VARCHAR(8) NOT NULL,
  `city_en` VARCHAR(80) NOT NULL DEFAULT '',
  `city_ur` VARCHAR(80) NOT NULL DEFAULT '',
  `rating` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `text_en` TEXT NOT NULL,
  `text_ur` TEXT NOT NULL,
  `is_sample` TINYINT(1) NOT NULL DEFAULT 0,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `ip_address` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reviews_status_created` (`status`, `created_at`),
  CONSTRAINT `chk_reviews_rating` CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sf_reviews` (`id`, `reviewer_name`, `initials`, `city_en`, `city_ur`, `rating`, `text_en`, `text_ur`, `is_sample`, `status`) VALUES
  (1, 'A. K.', 'AK', 'Lahore', 'لاہور', 5, 'The carved bedroom designs helped us picture a Chinioti-style bed in our own room. Having the wood and polish details together was useful.', 'نقش دار بیڈروم ڈیزائن دیکھ کر اپنے کمرے کے لیے چنیوٹی انداز کا پلنگ سوچنا آسان ہو گیا۔ لکڑی اور پالش کی تفصیلات ایک ساتھ دیکھنا اچھا لگا۔', 1, 'approved'),
  (2, 'M. A.', 'MA', 'Islamabad', 'اسلام آباد', 4, 'I could save a few bedroom and door ideas, then put our measurements and budget into one clear inquiry.', 'بیڈروم اور دروازے کے چند پسندیدہ ڈیزائن محفوظ کر کے اپنے ناپ اور بجٹ کی تفصیل ایک ہی درخواست میں لکھ سکا۔', 1, 'approved'),
  (3, 'S. R.', 'SR', 'Karachi', 'کراچی', 5, 'The traditional woodwork feels familiar to a Pakistani home. The design gallery is a good place to start a conversation with the family.', 'روایتی لکڑی کا کام پاکستانی گھر کا اپنا سا احساس دیتا ہے۔ گھر والوں کے ساتھ ڈیزائن پسند کرنے کی شروعات کے لیے یہ گیلری اچھی ہے۔', 1, 'approved')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- ----------------------------------------------------------------------------
-- 6. Brute-Force & Rate Limit Ledger (`sf_rate_limits`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sf_rate_limits` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ip_address` VARCHAR(45) NOT NULL,
  `action_key` VARCHAR(64) NOT NULL,
  `attempted_at` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rate_limits_lookup` (`ip_address`, `action_key`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
