<?php
declare(strict_types=1);

/**
 * Shahbaz Furniture (شہباز فرنیچر) — Complete Private Admin Panel (/ad/ad-wz)
 * Target Compatibility: PHP 8.3, PHP 8.4, PHP 8.5+
 * Security:
 *  - Isolated at /ad/ad-wz (no links anywhere on public website)
 *  - Bot, crawler & scanner blocking + X-Robots-Tag: noindex, nofollow
 *  - Simple white login screen with Username & Password only (no forgot password, no backdoors)
 *  - IP + Session Rate Limiting (max 5 attempts per 15 minutes)
 *  - Argon2id + constant-time verification + CSRF protection
 */

namespace ShahbazFurniture\Admin;

require_once dirname(__DIR__) . '/config.php';

use finfo;
use ShahbazFurniture\Core\AppConfig;
use ShahbazFurniture\Core\Database;
use ShahbazFurniture\Core\LocalStore;
use ShahbazFurniture\Core\SecurityGuard;
use Throwable;
use const ShahbazFurniture\Core\SF_ADMIN_PASS;
use const ShahbazFurniture\Core\SF_ADMIN_USER;

SecurityGuard::bootstrap(isJsonApi: false, isAdminRoute: true);

$pdo = Database::getConnection();
$csrfToken = SecurityGuard::getCsrfToken();
$errorMsg = '';
$noticeMsg = '';

// -----------------------------------------------------------------------------
// 1. Handle Logout
// -----------------------------------------------------------------------------
if (($_GET['action'] ?? '') === 'logout' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (SecurityGuard::verifyCsrfToken($_POST['csrf_token'] ?? null)) {
        $_SESSION = [];
        session_regenerate_id(true);
        session_destroy();
        header('Location: /ad/ad-wz');
        exit;
    }
}

// -----------------------------------------------------------------------------
// 2. Handle Login (Username + Password only, Honeypot check, Rate-Limited)
// -----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['form_action'] ?? '') === 'login') {
    if (!empty($_POST['website_url'])) {
        http_response_code(403);
        exit;
    }

    if (!SecurityGuard::verifyCsrfToken($_POST['csrf_token'] ?? null)) {
        $errorMsg = 'Invalid request token.';
    } elseif (!SecurityGuard::checkRateLimit($pdo, 'ad_wz_login', AppConfig::MAX_LOGIN_ATTEMPTS, AppConfig::LOCKOUT_SECONDS)) {
        http_response_code(429);
        $errorMsg = 'Too many attempts. Please wait 15 minutes.';
    } else {
        $username = SecurityGuard::cleanInput($_POST['username'] ?? '', 64);
        $password = (string) ($_POST['password'] ?? '');

        $authenticated = false;

        // Check database admin table if MySQL is connected
        if ($pdo !== null) {
            try {
                $stmt = $pdo->prepare('SELECT id, username, password_hash, role FROM sf_admins WHERE username = :username LIMIT 1');
                $stmt->execute([':username' => $username]);
                $admin = $stmt->fetch();

                if (is_array($admin) && SecurityGuard::verifyPassword($password, (string) $admin['password_hash'])) {
                    $authenticated = true;
                    session_regenerate_id(true);
                    $_SESSION['admin_id'] = (int) $admin['id'];
                    $_SESSION['admin_username'] = (string) $admin['username'];
                    $_SESSION['admin_role'] = (string) $admin['role'];
                    $_SESSION['_created_at'] = time();

                    $upd = $pdo->prepare('UPDATE sf_admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id');
                    $upd->execute([':id' => (int) $admin['id']]);
                }
            } catch (Throwable) {
                $authenticated = false;
            }
        }

        // Also allow direct constant-time verification against SF_ADMIN_USER / SF_ADMIN_PASS from config.php
        if (!$authenticated) {
            $cfgUser = (string) (getenv('ADMIN_USERNAME') ?: SF_ADMIN_USER);
            $cfgPass = (string) (getenv('ADMIN_PASSWORD') ?: SF_ADMIN_PASS);
            if ($cfgUser !== '' && $cfgPass !== '' && hash_equals($cfgUser, $username) && hash_equals($cfgPass, $password)) {
                $authenticated = true;
                session_regenerate_id(true);
                $_SESSION['admin_id'] = 1;
                $_SESSION['admin_username'] = $cfgUser;
                $_SESSION['admin_role'] = 'superadmin';
                $_SESSION['_created_at'] = time();
            }
        }

        if ($authenticated) {
            header('Location: /ad/ad-wz');
            exit;
        }
        $errorMsg = 'Invalid username or password.';
    }
}

$isLoggedIn = !empty($_SESSION['admin_id']) && is_int($_SESSION['admin_id']);

// -----------------------------------------------------------------------------
// 3. Unauthenticated View: Simple White Login Page (Username & Password Only)
// -----------------------------------------------------------------------------
if (!$isLoggedIn):
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title>Admin Login</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            color: #111111;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 1.5rem;
        }
        .login-box {
            width: 100%;
            max-width: 360px;
            background: #ffffff;
            border: 1px solid #d4d4d4;
            padding: 2rem;
        }
        h1 {
            margin: 0 0 1.25rem;
            font-size: 1.125rem;
            font-weight: 600;
            color: #111111;
        }
        .field { margin-bottom: 1rem; }
        label {
            display: block;
            font-size: 0.75rem;
            font-weight: 500;
            margin-bottom: 0.375rem;
            color: #222222;
        }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 0.55rem 0.75rem;
            border: 1px solid #bdbdbd;
            background: #ffffff;
            color: #111111;
            font-size: 0.875rem;
            border-radius: 0;
        }
        input[type="text"]:focus, input[type="password"]:focus {
            outline: 1px solid #111111;
            border-color: #111111;
        }
        button {
            width: 100%;
            margin-top: 0.5rem;
            padding: 0.65rem 1rem;
            background: #111111;
            color: #ffffff;
            border: 0;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
        }
        button:hover { background: #222222; }
        .error {
            margin-bottom: 1rem;
            padding: 0.625rem 0.75rem;
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
            font-size: 0.75rem;
        }
        .hp { position: absolute; left: -9999px; opacity: 0; height: 0; width: 0; overflow: hidden; }
    </style>
</head>
<body>
    <main class="login-box">
        <h1>Admin Login</h1>
        <?php if ($errorMsg !== ''): ?>
            <div class="error" role="alert"><?= SecurityGuard::escape($errorMsg) ?></div>
        <?php endif; ?>
        <form method="post" action="/ad/ad-wz" autocomplete="off">
            <input type="hidden" name="csrf_token" value="<?= SecurityGuard::escape($csrfToken) ?>">
            <input type="hidden" name="form_action" value="login">
            <div class="hp" aria-hidden="true">
                <label for="website_url">Website</label>
                <input id="website_url" name="website_url" type="text" tabindex="-1" autocomplete="off">
            </div>
            <div class="field">
                <label for="username">Username</label>
                <input id="username" name="username" type="text" required maxlength="64" autocomplete="username">
            </div>
            <div class="field">
                <label for="password">Password</label>
                <input id="password" name="password" type="password" required maxlength="128" autocomplete="current-password">
            </div>
            <button type="submit">Log In</button>
        </form>
    </main>
</body>
</html>
<?php
exit;
endif;

// -----------------------------------------------------------------------------
// 4. Authenticated Admin Mutations
// -----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $pdo !== null) {
    if (!SecurityGuard::verifyCsrfToken($_POST['csrf_token'] ?? null)) {
        $errorMsg = 'Invalid CSRF token.';
    } else {
        $formAction = SecurityGuard::cleanInput($_POST['form_action'] ?? '', 64);
        try {
            switch ($formAction) {
                case 'save_settings':
                    $brandEn  = SecurityGuard::cleanInput($_POST['brand_en'] ?? AppConfig::APP_NAME, 120);
                    $brandUr  = SecurityGuard::cleanInput($_POST['brand_ur'] ?? AppConfig::APP_NAME_UR, 120);
                    $whatsapp = preg_replace('/\D/', '', SecurityGuard::cleanInput($_POST['whatsapp_number'] ?? AppConfig::DEFAULT_WHATSAPP, 25)) ?: AppConfig::DEFAULT_WHATSAPP;
                    $phone    = SecurityGuard::cleanInput($_POST['phone_display'] ?? AppConfig::DEFAULT_PHONE, 40);

                    $stmt = $pdo->prepare(
                        'INSERT INTO sf_settings (setting_key, setting_value) VALUES (:k, :v)
                         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
                    );
                    foreach ([
                        'brand_en'        => $brandEn,
                        'brand_ur'        => $brandUr,
                        'whatsapp_number' => $whatsapp,
                        'phone_display'   => $phone,
                    ] as $k => $v) {
                        $stmt->execute([':k' => $k, ':v' => $v]);
                    }
                    $noticeMsg = 'Showroom settings updated.';
                    break;

                case 'save_product':
                    $id         = preg_replace('/[^a-z0-9-]/', '', strtolower(SecurityGuard::cleanInput($_POST['id'] ?? '', 80))) ?: ('design-' . time());
                    $category   = SecurityGuard::cleanInput($_POST['category'] ?? 'bedroom', 40);
                    $titleEn    = SecurityGuard::cleanInput($_POST['title_en'] ?? '', 160);
                    $titleUr    = SecurityGuard::cleanInput($_POST['title_ur'] ?? '', 160);
                    $descEn     = SecurityGuard::cleanInput($_POST['description_en'] ?? '', 1500);
                    $descUr     = SecurityGuard::cleanInput($_POST['description_ur'] ?? '', 1500);
                    $defaultImg = SecurityGuard::cleanInput($_POST['default_image'] ?? 'assets/real/photo-01.jpg', 255);
                    $featured   = isset($_POST['featured']) ? 1 : 0;

                    // Optional image upload with strict finfo MIME + getimagesize verification
                    if (isset($_FILES['photo_upload']) && is_array($_FILES['photo_upload']) && (int) $_FILES['photo_upload']['error'] === UPLOAD_ERR_OK) {
                        $tmpPath = (string) $_FILES['photo_upload']['tmp_name'];
                        $size    = (int) $_FILES['photo_upload']['size'];
                        if ($size > 0 && $size <= 5 * 1024 * 1024 && is_uploaded_file($tmpPath)) {
                            $finfo = new finfo(FILEINFO_MIME_TYPE);
                            $mime  = (string) $finfo->file($tmpPath);
                            $allowedMimes = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
                            $imgDims = @getimagesize($tmpPath);
                            if (isset($allowedMimes[$mime]) && is_array($imgDims) && $imgDims[0] > 0 && $imgDims[1] > 0) {
                                $ext = $allowedMimes[$mime];
                                $fileName = 'photo-custom-' . bin2hex(random_bytes(6)) . '.' . $ext;
                                $destDir  = dirname(__DIR__) . '/assets/real';
                                if (is_dir($destDir) && is_writable($destDir)) {
                                    $destPath = $destDir . '/' . $fileName;
                                    if (move_uploaded_file($tmpPath, $destPath)) {
                                        @chmod($destPath, 0644);
                                        $defaultImg = 'assets/real/' . $fileName;
                                    }
                                }
                            }
                        }
                    }

                    $allowedCategories = ['bedroom', 'living', 'kitchen', 'storage', 'doors', 'office', 'dining', 'custom'];
                    if (!in_array($category, $allowedCategories, true)) {
                        $category = 'custom';
                    }

                    $specsEn = [
                        'Select this photo as your design reference',
                        'Discuss dimensions, materials, upholstery and finish',
                        'Price, availability and timeline confirmed before an order',
                    ];
                    $specsUr = [
                        'اس تصویر کو اپنی پسند کے ڈیزائن کے طور پر منتخب کریں',
                        'پیمائش، لکڑی، کپڑے اور پالش کی تفصیلات طے کریں',
                        'آرڈر سے پہلے قیمت، دستیابی اور وقت کی تصدیق کریں',
                    ];

                    $stmt = $pdo->prepare(
                        'INSERT INTO sf_products
                            (id, category, title_en, title_ur, description_en, description_ur, default_image, images_json, specs_en_json, specs_ur_json, tags, featured, is_active)
                         VALUES
                            (:id, :category, :title_en, :title_ur, :desc_en, :desc_ur, :img, :imgs, :specs_en, :specs_ur, :tags, :featured, 1)
                         ON DUPLICATE KEY UPDATE
                            category = VALUES(category),
                            title_en = VALUES(title_en),
                            title_ur = VALUES(title_ur),
                            description_en = VALUES(description_en),
                            description_ur = VALUES(description_ur),
                            default_image = VALUES(default_image),
                            featured = VALUES(featured)'
                    );
                    $stmt->execute([
                        ':id'       => $id,
                        ':category' => $category,
                        ':title_en' => $titleEn,
                        ':title_ur' => $titleUr ?: $titleEn,
                        ':desc_en'  => $descEn,
                        ':desc_ur'  => $descUr ?: $descEn,
                        ':img'      => $defaultImg,
                        ':imgs'     => json_encode([$defaultImg], JSON_UNESCAPED_SLASHES),
                        ':specs_en' => json_encode($specsEn, JSON_UNESCAPED_UNICODE),
                        ':specs_ur' => json_encode($specsUr, JSON_UNESCAPED_UNICODE),
                        ':tags'     => "$titleEn $titleUr $category furniture فرنیچر",
                        ':featured' => $featured,
                    ]);
                    $noticeMsg = 'Design saved to catalogue.';
                    break;

                case 'delete_product':
                    $id = SecurityGuard::cleanInput($_POST['product_id'] ?? '', 80);
                    $stmt = $pdo->prepare('DELETE FROM sf_products WHERE id = :id');
                    $stmt->execute([':id' => $id]);
                    $noticeMsg = 'Design deleted.';
                    break;

                case 'update_inquiry_status':
                    $inquiryId = (int) ($_POST['inquiry_id'] ?? 0);
                    $status    = SecurityGuard::cleanInput($_POST['status'] ?? 'new', 32);
                    $allowedStatuses = ['new', 'contacted', 'quoted', 'in_production', 'completed', 'archived'];
                    if (in_array($status, $allowedStatuses, true) && $inquiryId > 0) {
                        $stmt = $pdo->prepare('UPDATE sf_inquiries SET status = :status WHERE id = :id');
                        $stmt->execute([':status' => $status, ':id' => $inquiryId]);
                        $noticeMsg = 'Inquiry status updated.';
                    }
                    break;

                case 'delete_inquiry':
                    $inquiryId = (int) ($_POST['inquiry_id'] ?? 0);
                    if ($inquiryId > 0) {
                        $stmt = $pdo->prepare('DELETE FROM sf_inquiries WHERE id = :id');
                        $stmt->execute([':id' => $inquiryId]);
                        $noticeMsg = 'Inquiry removed.';
                    }
                    break;

                case 'moderate_review':
                    $reviewId = (int) ($_POST['review_id'] ?? 0);
                    $status   = SecurityGuard::cleanInput($_POST['status'] ?? 'pending', 20);
                    if (in_array($status, ['pending', 'approved', 'rejected'], true) && $reviewId > 0) {
                        $stmt = $pdo->prepare('UPDATE sf_reviews SET status = :status WHERE id = :id');
                        $stmt->execute([':status' => $status, ':id' => $reviewId]);
                        $noticeMsg = 'Review status updated.';
                    }
                    break;

                case 'delete_review':
                    $reviewId = (int) ($_POST['review_id'] ?? 0);
                    if ($reviewId > 0) {
                        $stmt = $pdo->prepare('DELETE FROM sf_reviews WHERE id = :id');
                        $stmt->execute([':id' => $reviewId]);
                        $noticeMsg = 'Review deleted.';
                    }
                    break;
            }
        } catch (Throwable) {
            $errorMsg = 'Action could not be completed.';
        }
    }
}

$settings = [
    'brand_en'        => AppConfig::APP_NAME,
    'brand_ur'        => AppConfig::APP_NAME_UR,
    'whatsapp_number' => AppConfig::DEFAULT_WHATSAPP,
    'phone_display'   => AppConfig::DEFAULT_PHONE,
];
$products  = [];
$inquiries = [];
$reviews   = [];

if ($pdo !== null) {
    try {
        foreach ($pdo->query('SELECT setting_key, setting_value FROM sf_settings')->fetchAll() as $row) {
            $settings[(string) $row['setting_key']] = (string) $row['setting_value'];
        }
        $products  = $pdo->query('SELECT * FROM sf_products ORDER BY sort_order ASC, created_at DESC')->fetchAll();
        $inquiries = $pdo->query('SELECT * FROM sf_inquiries ORDER BY created_at DESC LIMIT 100')->fetchAll();
        $reviews   = $pdo->query('SELECT * FROM sf_reviews ORDER BY created_at DESC LIMIT 100')->fetchAll();
    } catch (Throwable) {
        // Ignore
    }
} else {
    foreach (LocalStore::getSeedCatalogue() as $item) {
        $products[] = [
            'id'             => $item['id'] ?? '',
            'category'       => $item['category'] ?? 'bedroom',
            'title_en'       => $item['title']['en'] ?? '',
            'title_ur'       => $item['title']['ur'] ?? '',
            'description_en' => $item['description']['en'] ?? '',
            'description_ur' => $item['description']['ur'] ?? '',
            'default_image'  => $item['defaultImage'] ?? 'assets/real/photo-01.jpg',
            'featured'       => 1,
        ];
    }
}
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title>Admin Panel — <?= SecurityGuard::escape($settings['brand_en']) ?></title>
    <style>
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background: #111310; color: #f4efe6; font-family: system-ui, -apple-system, sans-serif; padding: 1.5rem; line-height: 1.5; }
        .wrap { max-width: 1320px; margin: 0 auto; }
        header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; border-bottom: 1px solid rgba(214,179,106,0.25); padding-bottom: 1rem; margin-bottom: 1.75rem; }
        h1 { margin: 0; font-size: 1.25rem; color: #f4efe6; }
        h2 { margin: 0 0 1rem; font-size: 1rem; color: #d6b36a; text-transform: uppercase; letter-spacing: 0.05em; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .card { background: #181b16; border: 1px solid rgba(255,255,255,0.1); padding: 1.25rem; margin-bottom: 1.5rem; }
        .stat-val { font-size: 1.85rem; font-weight: 700; color: #d6b36a; font-family: monospace; margin-top: 0.25rem; }
        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
        label { display: block; font-size: 0.75rem; color: #b9b2a3; margin-bottom: 0.35rem; }
        input[type="text"], input[type="file"], select, textarea {
            width: 100%; padding: 0.55rem 0.75rem; background: #111310; border: 1px solid rgba(255,255,255,0.18); color: #f4efe6; font-size: 0.85rem;
        }
        .btn { background: #d6b36a; color: #141613; border: 0; padding: 0.55rem 1.1rem; font-size: 0.8125rem; font-weight: 600; cursor: pointer; display: inline-block; }
        .btn-danger { background: #451a1a; color: #fecaca; border: 1px solid rgba(248,113,113,0.3); padding: 0.35rem 0.75rem; font-size: 0.75rem; cursor: pointer; }
        .btn-outline { background: transparent; color: #f4efe6; border: 1px solid rgba(255,255,255,0.2); padding: 0.45rem 0.9rem; font-size: 0.75rem; cursor: pointer; }
        table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        th, td { padding: 0.65rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: left; vertical-align: middle; }
        th { color: #9c9587; font-size: 0.72rem; text-transform: uppercase; }
        .notice { background: #14291d; border: 1px solid #34d399; color: #a7f3d0; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.85rem; }
        .error { background: #3b1818; border: 1px solid #f87171; color: #fecaca; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.85rem; }
        .inline-form { display: inline-block; margin-right: 0.35rem; }
    </style>
</head>
<body>
<div class="wrap">
    <header>
        <div>
            <small style="color:#d6b36a;letter-spacing:0.08em;text-transform:uppercase;"><?= SecurityGuard::escape($settings['brand_en']) ?> · <?= SecurityGuard::escape($settings['brand_ur']) ?></small>
            <h1>Admin Control Panel</h1>
        </div>
        <form method="post" action="/ad/ad-wz?action=logout">
            <input type="hidden" name="csrf_token" value="<?= SecurityGuard::escape($csrfToken) ?>">
            <button type="submit" class="btn-outline">Sign Out</button>
        </form>
    </header>

    <?php if ($noticeMsg !== ''): ?>
        <div class="notice" role="status"><?= SecurityGuard::escape($noticeMsg) ?></div>
    <?php endif; ?>
    <?php if ($errorMsg !== ''): ?>
        <div class="error" role="alert"><?= SecurityGuard::escape($errorMsg) ?></div>
    <?php endif; ?>

    <div class="stats">
        <div class="card" style="margin:0;">
            <small style="color:#b9b2a3;">CATALOGUE DESIGNS</small>
            <div class="stat-val"><?= count($products) ?></div>
        </div>
        <div class="card" style="margin:0;">
            <small style="color:#b9b2a3;">CUSTOMER INQUIRIES</small>
            <div class="stat-val"><?= count($inquiries) ?></div>
        </div>
        <div class="card" style="margin:0;">
            <small style="color:#b9b2a3;">CUSTOMER REVIEWS</small>
            <div class="stat-val"><?= count($reviews) ?></div>
        </div>
        <div class="card" style="margin:0;">
            <small style="color:#b9b2a3;">DATABASE STATUS</small>
            <div class="stat-val" style="color:<?= $pdo ? '#34d399' : '#fbbf24' ?>;font-size:1.25rem;padding-top:0.4rem;">
                <?= $pdo ? 'MySQL Connected' : 'Edit config.php' ?>
            </div>
        </div>
    </div>

    <!-- 1. Showroom Brand & Contact Settings -->
    <section class="card">
        <h2>1. Showroom Brand &amp; WhatsApp Settings</h2>
        <form method="post" action="/ad/ad-wz">
            <input type="hidden" name="csrf_token" value="<?= SecurityGuard::escape($csrfToken) ?>">
            <input type="hidden" name="form_action" value="save_settings">
            <div class="grid-2" style="margin-bottom:1rem;">
                <div>
                    <label for="brand_en">Brand Name (English)</label>
                    <input id="brand_en" name="brand_en" type="text" value="<?= SecurityGuard::escape($settings['brand_en']) ?>" required>
                </div>
                <div>
                    <label for="brand_ur">Brand Name (Urdu)</label>
                    <input id="brand_ur" name="brand_ur" type="text" dir="rtl" value="<?= SecurityGuard::escape($settings['brand_ur']) ?>" required>
                </div>
                <div>
                    <label for="whatsapp_number">WhatsApp Number (with country code, digits only)</label>
                    <input id="whatsapp_number" name="whatsapp_number" type="text" value="<?= SecurityGuard::escape($settings['whatsapp_number']) ?>" required>
                </div>
                <div>
                    <label for="phone_display">Public Display Phone</label>
                    <input id="phone_display" name="phone_display" type="text" value="<?= SecurityGuard::escape($settings['phone_display']) ?>" required>
                </div>
            </div>
            <button type="submit" class="btn">Save Settings</button>
        </form>
    </section>

    <!-- 2. Add or Update Furniture Design -->
    <section class="card">
        <h2>2. Add or Update Furniture Design</h2>
        <form method="post" action="/ad/ad-wz" enctype="multipart/form-data">
            <input type="hidden" name="csrf_token" value="<?= SecurityGuard::escape($csrfToken) ?>">
            <input type="hidden" name="form_action" value="save_product">
            <div class="grid-3" style="margin-bottom:1rem;">
                <div>
                    <label for="title_en">Title (English) *</label>
                    <input id="title_en" name="title_en" type="text" required placeholder="e.g. Royal Chinioti Bed">
                </div>
                <div>
                    <label for="title_ur">Title (Urdu / اردو)</label>
                    <input id="title_ur" name="title_ur" type="text" dir="rtl" placeholder="شاہی چنیوٹی بیڈ">
                </div>
                <div>
                    <label for="category">Category *</label>
                    <select id="category" name="category">
                        <option value="bedroom">Bedroom / بیڈروم</option>
                        <option value="living">Baithak &amp; Living / بیٹھک</option>
                        <option value="kitchen">Kitchens / کچن</option>
                        <option value="storage">Storage &amp; Wardrobes / الماری</option>
                        <option value="doors">Doors / دروازے</option>
                        <option value="custom">Custom Woodwork / لکڑی کا کام</option>
                    </select>
                </div>
            </div>
            <div class="grid-2" style="margin-bottom:1rem;">
                <div>
                    <label for="description_en">Description (English) *</label>
                    <textarea id="description_en" name="description_en" rows="2" required></textarea>
                </div>
                <div>
                    <label for="description_ur">Description (Urdu / اردو)</label>
                    <textarea id="description_ur" name="description_ur" rows="2" dir="rtl"></textarea>
                </div>
            </div>
            <div class="grid-3" style="margin-bottom:1rem;align-items:end;">
                <div>
                    <label for="default_image">Select Built-in Photo</label>
                    <select id="default_image" name="default_image">
                        <?php for ($i = 1; $i <= 40; $i++): $num = str_pad((string) $i, 2, '0', STR_PAD_LEFT); ?>
                            <option value="assets/real/photo-<?= $num ?>.jpg">assets/real/photo-<?= $num ?>.jpg</option>
                        <?php endfor; ?>
                    </select>
                </div>
                <div>
                    <label for="photo_upload">Or Upload New Photo (JPG/PNG/WebP)</label>
                    <input id="photo_upload" name="photo_upload" type="file" accept="image/jpeg,image/png,image/webp">
                </div>
                <div>
                    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                        <input type="checkbox" name="featured" value="1" checked> Featured Design
                    </label>
                </div>
            </div>
            <button type="submit" class="btn">Save Design to Catalogue</button>
        </form>
    </section>

    <!-- 3. Customer Project Inquiries -->
    <section class="card">
        <h2>3. Customer Project Inquiries (<?= count($inquiries) ?>)</h2>
        <?php if (empty($inquiries)): ?>
            <p style="color:#9c9587;font-size:0.85rem;">No customer inquiries recorded yet.</p>
        <?php else: ?>
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Phone</th>
                            <th>City</th>
                            <th>Project</th>
                            <th>Message</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($inquiries as $inq): ?>
                            <tr>
                                <td><strong><?= SecurityGuard::escape((string) $inq['customer_name']) ?></strong></td>
                                <td style="font-family:monospace;color:#d6b36a;"><?= SecurityGuard::escape((string) $inq['phone']) ?></td>
                                <td><?= SecurityGuard::escape((string) $inq['city']) ?></td>
                                <td><?= SecurityGuard::escape((string) $inq['project_type']) ?></td>
                                <td style="max-width:340px;white-space:pre-wrap;"><?= SecurityGuard::escape((string) $inq['message']) ?></td>
                                <td>
                                    <form method="post" action="/ad/ad-wz" class="inline-form">
                                        <input type="hidden" name="csrf_token" value="<?= SecurityGuard::escape($csrfToken) ?>">
                                        <input type="hidden" name="form_action" value="update_inquiry_status">
                                        <input type="hidden" name="inquiry_id" value="<?= (int) $inq['id'] ?>">
                                        <select name="status" onchange="this.form.submit()" style="width:auto;padding:0.3rem 0.5rem;">
                                            <?php foreach (['new', 'contacted', 'quoted', 'in_production', 'completed', 'archived'] as $st): ?>
                                                <option value="<?= $st ?>" <?= ($inq['status'] ?? '') === $st ? 'selected' : '' ?>><?= $st ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    </form>
                                </td>
                                <td>
                                    <form method="post" action="/ad/ad-wz" class="inline-form">
                                        <input type="hidden" name="csrf_token" value="<?= SecurityGuard::escape($csrfToken) ?>">
                                        <input type="hidden" name="form_action" value="delete_inquiry">
                                        <input type="hidden" name="inquiry_id" value="<?= (int) $inq['id'] ?>">
                                        <button type="submit" class="btn-danger">Delete</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </section>

    <!-- 4. Customer Reviews Moderation -->
    <section class="card">
        <h2>4. Customer Reviews Moderation (<?= count($reviews) ?>)</h2>
        <?php if (empty($reviews)): ?>
            <p style="color:#9c9587;font-size:0.85rem;">No reviews found.</p>
        <?php else: ?>
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Reviewer</th>
                            <th>City</th>
                            <th>Rating</th>
                            <th>Review</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($reviews as $rev): ?>
                            <tr>
                                <td><strong><?= SecurityGuard::escape((string) $rev['reviewer_name']) ?></strong></td>
                                <td><?= SecurityGuard::escape((string) $rev['city_en']) ?></td>
                                <td style="color:#d6b36a;font-family:monospace;"><?= (int) $rev['rating'] ?> / 5</td>
                                <td style="max-width:380px;"><?= SecurityGuard::escape((string) $rev['review_en']) ?></td>
                                <td><?= SecurityGuard::escape((string) $rev['status']) ?></td>
                                <td style="white-space:nowrap;">
                                    <form method="post" action="/ad/ad-wz" class="inline-form">
                                        <input type="hidden" name="csrf_token" value="<?= SecurityGuard::escape($csrfToken) ?>">
                                        <input type="hidden" name="form_action" value="moderate_review">
                                        <input type="hidden" name="review_id" value="<?= (int) $rev['id'] ?>">
                                        <input type="hidden" name="status" value="approved">
                                        <button type="submit" class="btn-outline">Approve</button>
                                    </form>
                                    <form method="post" action="/ad/ad-wz" class="inline-form">
                                        <input type="hidden" name="csrf_token" value="<?= SecurityGuard::escape($csrfToken) ?>">
                                        <input type="hidden" name="form_action" value="moderate_review">
                                        <input type="hidden" name="review_id" value="<?= (int) $rev['id'] ?>">
                                        <input type="hidden" name="status" value="pending">
                                        <button type="submit" class="btn-outline">Hold</button>
                                    </form>
                                    <form method="post" action="/ad/ad-wz" class="inline-form">
                                        <input type="hidden" name="csrf_token" value="<?= SecurityGuard::escape($csrfToken) ?>">
                                        <input type="hidden" name="form_action" value="delete_review">
                                        <input type="hidden" name="review_id" value="<?= (int) $rev['id'] ?>">
                                        <button type="submit" class="btn-danger">Delete</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </section>

    <!-- 5. Active Catalogue Designs -->
    <section class="card">
        <h2>5. Active Catalogue Designs (<?= count($products) ?>)</h2>
        <div style="overflow-x:auto;max-height:520px;">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Category</th>
                        <th>English Title</th>
                        <th>Urdu Title</th>
                        <th>Image</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($products as $prod): ?>
                        <tr>
                            <td style="font-family:monospace;"><?= SecurityGuard::escape((string) $prod['id']) ?></td>
                            <td><?= SecurityGuard::escape((string) $prod['category']) ?></td>
                            <td><strong><?= SecurityGuard::escape((string) $prod['title_en']) ?></strong></td>
                            <td dir="rtl" lang="ur" style="color:#d6b36a;"><?= SecurityGuard::escape((string) $prod['title_ur']) ?></td>
                            <td style="font-family:monospace;font-size:0.75rem;"><?= SecurityGuard::escape((string) $prod['default_image']) ?></td>
                            <td>
                                <form method="post" action="/ad/ad-wz" class="inline-form">
                                    <input type="hidden" name="csrf_token" value="<?= SecurityGuard::escape($csrfToken) ?>">
                                    <input type="hidden" name="form_action" value="delete_product">
                                    <input type="hidden" name="product_id" value="<?= SecurityGuard::escape((string) $prod['id']) ?>">
                                    <button type="submit" class="btn-danger">Delete</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </section>
</div>
</body>
</html>
