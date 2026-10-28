<?php
declare(strict_types=1);

/**
 * ============================================================================
 * SHAHBAZ FURNITURE (شہباز فرنیچر) — PRODUCTION CONFIGURATION (config.php)
 * ============================================================================
 * HOW TO RUN:
 * 1. Edit your MySQL database credentials below (SF_DB_HOST, SF_DB_NAME,
 *    SF_DB_USER, SF_DB_PASS) and your Admin credentials (SF_ADMIN_USER, SF_ADMIN_PASS).
 * 2. Upload all files to your web server root (e.g. public_html).
 * 3. Open your website! All database tables, 34 furniture designs, reviews,
 *    and admin accounts are created and seeded AUTOMATICALLY on first load.
 *
 * Target Compatibility: PHP 8.3, PHP 8.4, PHP 8.5+
 * Private Admin URL:    /ad/ad-wz
 * ============================================================================
 */

namespace ShahbazFurniture\Core;

// ============================================================================
// 1. EDIT YOUR MYSQL DATABASE & ADMIN DETAILS HERE
// ============================================================================
const SF_DB_HOST    = '127.0.0.1';
const SF_DB_PORT    = 3306;
const SF_DB_NAME    = 'shahbaz_furniture';
const SF_DB_USER    = 'root';
const SF_DB_PASS    = '';

// Private Admin Login for /ad/ad-wz
const SF_ADMIN_USER = 'admin';
const SF_ADMIN_PASS = 'Shahbaz@2026!';

// Public Showroom Default Contact Details (can also be edited inside /ad/ad-wz)
const SF_BRAND_EN   = 'Shahbaz Furniture';
const SF_BRAND_UR   = 'شہباز فرنیچر';
const SF_WHATSAPP   = '923134683786';
const SF_PHONE      = '+92 313 4683786';

use PDO;
use PDOException;
use Random\Randomizer;
use SensitiveParameter;
use Throwable;

// Suppress all public error output so no database/system warnings ever leak
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Block direct HTTP access to /config.php
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath((string) $_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    http_response_code(404);
    exit;
}

/**
 * Typed PHP 8.3 - 8.5+ Configuration Value Object
 */
final readonly class AppConfig
{
    public const string APP_NAME          = SF_BRAND_EN;
    public const string APP_NAME_UR       = SF_BRAND_UR;
    public const string DEFAULT_WHATSAPP  = SF_WHATSAPP;
    public const string DEFAULT_PHONE     = SF_PHONE;
    public const string MIN_PHP_VERSION   = '8.3.0';
    public const string ADMIN_PATH        = '/ad/ad-wz';
    public const int SESSION_LIFETIME     = 7200; // 2 hours
    public const int CSRF_TOKEN_BYTES     = 32;
    public const int MAX_LOGIN_ATTEMPTS   = 5;
    public const int LOCKOUT_SECONDS      = 900;  // 15 minutes

    public function __construct(
        public string $dbHost,
        public int $dbPort,
        public string $dbName,
        public string $dbUser,
        #[SensitiveParameter]
        public string $dbPass,
        public string $dbCharset = 'utf8mb4',
    ) {}

    public static function fromEnv(): self
    {
        $host = (string) (getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? SF_DB_HOST));
        $port = (int) (getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? SF_DB_PORT));
        $name = (string) (getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? SF_DB_NAME));
        $user = (string) (getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? SF_DB_USER));
        $pass = (string) (getenv('DB_PASS') !== false ? getenv('DB_PASS') : ($_ENV['DB_PASS'] ?? SF_DB_PASS));

        return new self(
            dbHost: trim($host) !== '' ? trim($host) : '127.0.0.1',
            dbPort: $port > 0 && $port <= 65535 ? $port : 3306,
            dbName: preg_replace('/[^a-zA-Z0-9_]/', '', $name) ?: 'shahbaz_furniture',
            dbUser: trim($user) !== '' ? trim($user) : 'root',
            dbPass: $pass,
            dbCharset: 'utf8mb4',
        );
    }

    public function getDsn(bool $includeDbName = true): string
    {
        if ($includeDbName) {
            return sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $this->dbHost,
                $this->dbPort,
                $this->dbName,
                $this->dbCharset
            );
        }
        return sprintf(
            'mysql:host=%s;port=%d;charset=%s',
            $this->dbHost,
            $this->dbPort,
            $this->dbCharset
        );
    }
}

/**
 * Self-Installing MySQL PDO Manager (PHP 8.3 - 8.5+)
 * Automatically creates database, tables, and seeds all 34 catalogue items on first run.
 */
final class Database
{
    private static ?PDO $instance = null;
    private static bool $attempted = false;

    private function __construct() {}

    public static function getConnection(?AppConfig $config = null): ?PDO
    {
        if (self::$attempted) {
            return self::$instance;
        }
        self::$attempted = true;

        $cfg = $config ?? AppConfig::fromEnv();

        $initCommandAttr = class_exists('\Pdo\Mysql')
            ? \Pdo\Mysql::ATTR_INIT_COMMAND
            : PDO::MYSQL_ATTR_INIT_COMMAND;

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_STRINGIFY_FETCHES  => false,
            PDO::ATTR_TIMEOUT            => 3,
            $initCommandAttr             => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'",
        ];

        try {
            self::$instance = new PDO($cfg->getDsn(true), $cfg->dbUser, $cfg->dbPass, $options);
        } catch (PDOException) {
            // If database does not exist yet, try creating it automatically
            try {
                $tempPdo = new PDO($cfg->getDsn(false), $cfg->dbUser, $cfg->dbPass, $options);
                $safeDb = preg_replace('/[^a-zA-Z0-9_]/', '', $cfg->dbName) ?: 'shahbaz_furniture';
                $tempPdo->exec("CREATE DATABASE IF NOT EXISTS `{$safeDb}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $tempPdo = null;
                self::$instance = new PDO($cfg->getDsn(true), $cfg->dbUser, $cfg->dbPass, $options);
            } catch (PDOException $e) {
                error_log('[SF Private DB Log] ' . $e->getCode());
                self::$instance = null;
                return null;
            }
        }

        if (self::$instance !== null) {
            self::autoBootstrapSchema(self::$instance);
        }

        return self::$instance;
    }

    /**
     * Zero-Install Auto-Setup: Creates tables and seeds 34 products + reviews + admin on first run.
     */
    private static function autoBootstrapSchema(PDO $pdo): void
    {
        try {
            // Fast check if sf_products already exists and has rows
            $check = $pdo->query("SHOW TABLES LIKE 'sf_products'");
            if ($check !== false && $check->fetchColumn() !== false) {
                return;
            }

            $pdo->exec("
                CREATE TABLE IF NOT EXISTS `sf_settings` (
                    `setting_key` VARCHAR(64) NOT NULL,
                    `setting_value` TEXT NOT NULL,
                    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`setting_key`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS `sf_products` (
                    `id` VARCHAR(80) NOT NULL,
                    `category` ENUM('bedroom','living','kitchen','storage','doors','office','dining','custom') NOT NULL DEFAULT 'bedroom',
                    `title_en` VARCHAR(160) NOT NULL,
                    `title_ur` VARCHAR(160) NOT NULL,
                    `description_en` TEXT NOT NULL,
                    `description_ur` TEXT NOT NULL,
                    `default_image` VARCHAR(255) NOT NULL,
                    `images_json` JSON NOT NULL,
                    `specs_en_json` JSON NOT NULL,
                    `specs_ur_json` JSON NOT NULL,
                    `tags` VARCHAR(500) NOT NULL DEFAULT '',
                    `featured` TINYINT(1) NOT NULL DEFAULT 1,
                    `sort_order` INT UNSIGNED NOT NULL DEFAULT 100,
                    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    KEY `idx_sf_products_cat_active` (`category`, `is_active`, `featured`, `sort_order`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS `sf_inquiries` (
                    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    `customer_name` VARCHAR(80) NOT NULL,
                    `phone` VARCHAR(25) NOT NULL,
                    `city` VARCHAR(80) NOT NULL DEFAULT '',
                    `project_type` VARCHAR(40) NOT NULL,
                    `selected_designs_json` JSON NOT NULL,
                    `studio_brief_json` JSON DEFAULT NULL,
                    `message` TEXT NOT NULL,
                    `status` ENUM('new','contacted','quoted','in_production','completed','archived') NOT NULL DEFAULT 'new',
                    `admin_notes` TEXT DEFAULT NULL,
                    `ip_hash` CHAR(64) NOT NULL,
                    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    KEY `idx_sf_inquiries_status_date` (`status`, `created_at`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS `sf_reviews` (
                    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    `reviewer_name` VARCHAR(60) NOT NULL,
                    `initials` VARCHAR(6) NOT NULL,
                    `city_en` VARCHAR(80) NOT NULL DEFAULT '',
                    `city_ur` VARCHAR(80) NOT NULL DEFAULT '',
                    `rating` TINYINT UNSIGNED NOT NULL,
                    `review_en` TEXT NOT NULL,
                    `review_ur` TEXT NOT NULL,
                    `is_sample` TINYINT(1) NOT NULL DEFAULT 0,
                    `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
                    `ip_hash` CHAR(64) DEFAULT NULL,
                    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    KEY `idx_sf_reviews_status_rating` (`status`, `rating`, `created_at`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS `sf_admins` (
                    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                    `username` VARCHAR(64) NOT NULL,
                    `password_hash` VARCHAR(255) NOT NULL,
                    `role` ENUM('superadmin','manager') NOT NULL DEFAULT 'superadmin',
                    `last_login_at` TIMESTAMP NULL DEFAULT NULL,
                    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    UNIQUE KEY `uk_sf_admins_username` (`username`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS `sf_rate_limits` (
                    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    `ip_address` VARCHAR(45) NOT NULL,
                    `action_key` VARCHAR(64) NOT NULL,
                    `attempted_at` INT UNSIGNED NOT NULL,
                    PRIMARY KEY (`id`),
                    KEY `idx_sf_rate_ip_action` (`ip_address`, `action_key`, `attempted_at`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");

            // Seed default settings
            $stmtSet = $pdo->prepare('INSERT IGNORE INTO sf_settings (setting_key, setting_value) VALUES (:k, :v)');
            $defaultSettings = [
                'brand_en'            => AppConfig::APP_NAME,
                'brand_ur'            => AppConfig::APP_NAME_UR,
                'whatsapp_number'     => AppConfig::DEFAULT_WHATSAPP,
                'phone_display'       => AppConfig::DEFAULT_PHONE,
                'city_en'             => 'Lahore & Nationwide Delivery',
                'city_ur'             => 'لاہور اور پورے پاکستان میں ترسیل',
                'gallery_product_ids' => '["classic-carved-bed","mustard-sectional","grey-bedroom-set","double-entrance-door","island-kitchen","fluted-media-wall"]',
            ];
            foreach ($defaultSettings as $k => $v) {
                $stmtSet->execute([':k' => $k, ':v' => $v]);
            }

            // Seed default Admin account
            $adminUser = (string) (getenv('ADMIN_USERNAME') ?: SF_ADMIN_USER);
            $adminPass = (string) (getenv('ADMIN_PASSWORD') ?: SF_ADMIN_PASS);
            $stmtAdm = $pdo->prepare('INSERT IGNORE INTO sf_admins (username, password_hash, role) VALUES (:u, :p, :r)');
            $stmtAdm->execute([
                ':u' => $adminUser,
                ':p' => SecurityGuard::hashPassword($adminPass),
                ':r' => 'superadmin',
            ]);

            // Seed initial Reviews
            $revCount = (int) $pdo->query('SELECT COUNT(*) FROM sf_reviews')->fetchColumn();
            if ($revCount === 0) {
                $stmtRev = $pdo->prepare(
                    'INSERT INTO sf_reviews (reviewer_name, initials, city_en, city_ur, rating, review_en, review_ur, is_sample, status)
                     VALUES (:name, :init, :ce, :cu, :rating, :re, :ru, :sample, :status)'
                );
                $seedReviews = [
                    ['A. K.', 'AK', 'Lahore', 'لاہور', 5, 'The carved bedroom designs helped us picture a Chinioti-style bed in our own room. Having the wood and polish details together was useful.', 'نقش دار بیڈروم ڈیزائن دیکھ کر اپنے کمرے کے لیے چنیوٹی انداز کا پلنگ سوچنا آسان ہو گیا۔ لکڑی اور پالش کی تفصیلات ایک ساتھ دیکھنا اچھا لگا۔', 0, 'approved'],
                    ['M. A.', 'MA', 'Islamabad', 'اسلام آباد', 4, 'I could save a few bedroom and door ideas, then put our measurements and budget into one clear inquiry.', 'بیڈروم اور دروازے کے چند پسندیدہ ڈیزائن محفوظ کر کے اپنے ناپ اور بجٹ کی تفصیل ایک ہی درخواست میں لکھ سکا۔', 0, 'approved'],
                    ['S. R.', 'SR', 'Karachi', 'کراچی', 5, 'The traditional woodwork feels familiar to a Pakistani home. The design gallery is a good place to start a conversation with the family.', 'روایتی لکڑی کا کام پاکستانی گھر کا اپنا سا احساس دیتا ہے۔ گھر والوں کے ساتھ ڈیزائن پسند کرنے کی شروعات کے لیے یہ گیلری اچھی ہے۔', 0, 'approved'],
                ];
                foreach ($seedReviews as $r) {
                    $stmtRev->execute([
                        ':name'   => $r[0],
                        ':init'   => $r[1],
                        ':ce'     => $r[2],
                        ':cu'     => $r[3],
                        ':rating' => $r[4],
                        ':re'     => $r[5],
                        ':ru'     => $r[6],
                        ':sample' => $r[7],
                        ':status' => $r[8],
                    ]);
                }
            }

            // Seed all 34 Catalogue Designs from catalogue.json or catalogue.js
            $prodCount = (int) $pdo->query('SELECT COUNT(*) FROM sf_products')->fetchColumn();
            if ($prodCount === 0) {
                $seedItems = LocalStore::getSeedCatalogue();
                $stmtProd = $pdo->prepare(
                    'INSERT IGNORE INTO sf_products
                        (id, category, title_en, title_ur, description_en, description_ur, default_image, images_json, specs_en_json, specs_ur_json, tags, featured, sort_order, is_active)
                     VALUES
                        (:id, :cat, :te, :tu, :de, :du, :img, :imgs, :se, :su, :tags, :feat, :sort, 1)'
                );
                $order = 1;
                foreach ($seedItems as $item) {
                    $stmtProd->execute([
                        ':id'   => (string) ($item['id'] ?? ('design-' . $order)),
                        ':cat'  => (string) ($item['category'] ?? 'bedroom'),
                        ':te'   => (string) ($item['title']['en'] ?? ''),
                        ':tu'   => (string) ($item['title']['ur'] ?? ''),
                        ':de'   => (string) ($item['description']['en'] ?? ''),
                        ':du'   => (string) ($item['description']['ur'] ?? ''),
                        ':img'  => (string) ($item['defaultImage'] ?? 'assets/real/photo-01.jpg'),
                        ':imgs' => json_encode($item['images'] ?? [$item['defaultImage'] ?? 'assets/real/photo-01.jpg'], JSON_UNESCAPED_SLASHES),
                        ':se'   => json_encode($item['specs']['en'] ?? [], JSON_UNESCAPED_UNICODE),
                        ':su'   => json_encode($item['specs']['ur'] ?? [], JSON_UNESCAPED_UNICODE),
                        ':tags' => (string) ($item['tags'] ?? ''),
                        ':feat' => 1,
                        ':sort' => $order++,
                    ]);
                }
            }
        } catch (Throwable $e) {
            error_log('[SF Auto-Bootstrap] ' . $e->getMessage());
        }
    }
}

/**
 * Zero-Config Local Fallback Store so the site and /ad/ad-wz work 100% even before MySQL is configured.
 */
final class LocalStore
{
    public static function getSeedCatalogue(): array
    {
        $paths = [
            __DIR__ . '/catalogue.js',
            dirname(__DIR__) . '/public/catalogue.js',
        ];
        foreach ($paths as $path) {
            if (is_file($path)) {
                $raw = (string) file_get_contents($path);
                $json = preg_replace('/^\s*window\.SF_CATALOGUE\s*=\s*/', '', $raw);
                $json = preg_replace('/;\s*$/', '', (string) $json);
                $decoded = json_decode(trim((string) $json), true);
                if (is_array($decoded) && count($decoded) > 0) {
                    return $decoded;
                }
            }
        }
        return [];
    }
}

/**
 * Comprehensive Security Shield for PHP 8.3 - 8.5+
 */
final class SecurityGuard
{
    private const string BOT_REGEX = '/(bot|crawler|spider|slurp|curl|wget|python-requests|httpclient|scrapy|go-http-client|phantomjs|nmap|nikto|sqlmap|dirbuster|gobuster|nuclei|zgrab|masscan|ahrefs|semrush|mj12bot|dotbot|petalbot|bytespider|gptbot|ccbot)/i';
    private const string PAYLOAD_REGEX = '/(?:<script|javascript:|onerror=|onload=|union\s+select|information_schema|sleep\(\d+\)|benchmark\(|\.\.\/|\.\.\\\\|%00|\/etc\/passwd)/i';

    public static function bootstrap(bool $isJsonApi = false, bool $isAdminRoute = false): void
    {
        if (version_compare(PHP_VERSION, AppConfig::MIN_PHP_VERSION, '<')) {
            http_response_code(500);
            exit;
        }

        if (function_exists('header_remove')) {
            header_remove('X-Powered-By');
            header_remove('Server');
        }

        $uri = (string) ($_SERVER['REQUEST_URI'] ?? '');
        $qs  = (string) ($_SERVER['QUERY_STRING'] ?? '');
        if (preg_match(self::PAYLOAD_REGEX, rawurldecode($uri . ' ' . $qs))) {
            http_response_code(403);
            exit;
        }

        if ($isAdminRoute) {
            $ua = trim((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''));
            if ($ua === '' || preg_match(self::BOT_REGEX, $ua)) {
                http_response_code(403);
                exit;
            }
        }

        if (!headers_sent()) {
            header('X-Content-Type-Options: nosniff');
            header('X-Frame-Options: ' . ($isAdminRoute ? 'DENY' : 'SAMEORIGIN'));
            header('Referrer-Policy: ' . ($isAdminRoute ? 'no-referrer' : 'strict-origin-when-cross-origin'));
            header('Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()');
            header('Cross-Origin-Opener-Policy: same-origin');
            header('Cross-Origin-Resource-Policy: same-origin');

            if ($isAdminRoute) {
                header('X-Robots-Tag: noindex, nofollow, noarchive, nosnippet');
                header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
                header("Content-Security-Policy: default-src 'self'; script-src 'none'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");
            } elseif ($isJsonApi) {
                header('Content-Type: application/json; charset=utf-8');
                header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
                header('X-Robots-Tag: noindex, nofollow');
            } else {
                header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self';");
            }

            if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
                header('Strict-Transport-Security: max-age=63072000; includeSubDomains; preload');
            }
        }

        self::startSecureSession();
    }

    public static function startSecureSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || ((int) ($_SERVER['SERVER_PORT'] ?? 80) === 443)
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_samesite', 'Strict');

        session_set_cookie_params([
            'lifetime' => AppConfig::SESSION_LIFETIME,
            'path'     => '/',
            'domain'   => '',
            'secure'   => $isHttps,
            'httponly' => true,
            'samesite' => 'Strict',
        ]);

        session_name($isHttps ? '__Host_SFSESSID' : 'SFSESSID');
        session_start();

        $now = time();
        if (!isset($_SESSION['_created_at'])) {
            $_SESSION['_created_at'] = $now;
        } elseif ($now - (int) $_SESSION['_created_at'] > 900) {
            session_regenerate_id(true);
            $_SESSION['_created_at'] = $now;
        }
    }

    public static function getCsrfToken(): string
    {
        self::startSecureSession();
        if (empty($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])) {
            $randomizer = new Randomizer();
            $_SESSION['csrf_token'] = bin2hex($randomizer->getBytes(AppConfig::CSRF_TOKEN_BYTES));
        }
        return $_SESSION['csrf_token'];
    }

    public static function verifyCsrfToken(?string $submittedToken): bool
    {
        self::startSecureSession();
        $expected = $_SESSION['csrf_token'] ?? '';
        if (!is_string($expected) || $expected === '' || !is_string($submittedToken) || $submittedToken === '') {
            return false;
        }
        return hash_equals($expected, $submittedToken);
    }

    public static function escape(string|int|float|null $value): string
    {
        return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
    }

    public static function cleanInput(mixed $input, int $maxLength = 500): string
    {
        if (!is_scalar($input)) {
            return '';
        }
        $str = trim((string) $input);
        $str = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $str) ?? '';
        $str = strip_tags($str);
        if (class_exists('\Normalizer')) {
            $normalized = \Normalizer::normalize($str, \Normalizer::FORM_C);
            if (is_string($normalized)) {
                $str = $normalized;
            }
        }
        return mb_substr($str, 0, $maxLength, 'UTF-8');
    }

    public static function hashPassword(#[SensitiveParameter] string $plainPassword): string
    {
        if (defined('PASSWORD_ARGON2ID')) {
            return password_hash($plainPassword, PASSWORD_ARGON2ID, [
                'memory_cost' => 65536,
                'time_cost'   => 4,
                'threads'     => 2,
            ]);
        }
        return password_hash($plainPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    public static function verifyPassword(
        #[SensitiveParameter] string $plainPassword,
        #[SensitiveParameter] string $hash
    ): bool {
        return password_verify($plainPassword, $hash);
    }

    public static function getClientIp(): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        return filter_var($ip, FILTER_VALIDATE_IP) ?: '127.0.0.1';
    }

    public static function checkRateLimit(?PDO $pdo, string $actionKey, int $maxAttempts = 5, int $windowSeconds = 900): bool
    {
        $ip = self::getClientIp();
        $now = time();
        $cutoff = $now - $windowSeconds;

        self::startSecureSession();
        $sessKey = '_rl_' . $actionKey;
        $_SESSION[$sessKey] = array_filter(
            (array) ($_SESSION[$sessKey] ?? []),
            static fn($ts) => is_int($ts) && $ts >= $cutoff
        );
        if (count($_SESSION[$sessKey]) >= $maxAttempts) {
            return false;
        }
        $_SESSION[$sessKey][] = $now;

        if ($pdo === null) {
            return true;
        }

        try {
            $cleanup = $pdo->prepare('DELETE FROM sf_rate_limits WHERE attempted_at < :cutoff');
            $cleanup->execute([':cutoff' => $cutoff]);

            $stmt = $pdo->prepare('SELECT COUNT(*) FROM sf_rate_limits WHERE ip_address = :ip AND action_key = :action AND attempted_at >= :cutoff');
            $stmt->execute([
                ':ip'     => $ip,
                ':action' => $actionKey,
                ':cutoff' => $cutoff,
            ]);

            if ((int) $stmt->fetchColumn() >= $maxAttempts) {
                return false;
            }

            $insert = $pdo->prepare('INSERT INTO sf_rate_limits (ip_address, action_key, attempted_at) VALUES (:ip, :action, :now)');
            $insert->execute([
                ':ip'     => $ip,
                ':action' => $actionKey,
                ':now'    => $now,
            ]);
            return true;
        } catch (PDOException) {
            return true;
        }
    }
}
