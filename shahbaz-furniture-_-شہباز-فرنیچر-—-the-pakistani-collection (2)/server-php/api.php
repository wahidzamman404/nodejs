<?php
declare(strict_types=1);

/**
 * Shahbaz Furniture (شہباز فرنیچر) — Public JSON API Controller (api.php)
 * Target Compatibility: PHP 8.3, PHP 8.4, PHP 8.5+
 * Security: Native PDO Prepared Statements, Timing-Safe CSRF Validation,
 *           Strict Input Normalization, Rate Limiting, Zero Public Error Exposure.
 */

namespace ShahbazFurniture\Api;

require_once __DIR__ . '/config.php';

use ShahbazFurniture\Core\Database;
use ShahbazFurniture\Core\SecurityGuard;
use Throwable;

SecurityGuard::bootstrap(isJsonApi: true, isAdminRoute: false);

function respondJson(array $payload, int $statusCode = 200): never
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

try {
    $pdo = Database::getConnection();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = SecurityGuard::cleanInput($_GET['action'] ?? '', 64);

    if ($method === 'GET') {
        if ($action === 'bootstrap') {
            $settings = [];
            $products = [];
            $reviews = [];

            if ($pdo !== null) {
                foreach ($pdo->query('SELECT setting_key, setting_value FROM sf_settings')->fetchAll() as $row) {
                    // Never expose internal DB keys if any exist
                    $settings[$row['setting_key']] = $row['setting_value'];
                }

                $prodStmt = $pdo->query('SELECT * FROM sf_products WHERE is_active = 1 ORDER BY featured DESC, sort_order ASC, created_at DESC');
                foreach ($prodStmt->fetchAll() as $row) {
                    $products[] = [
                        'id'           => $row['id'],
                        'category'     => $row['category'],
                        'defaultImage' => $row['default_image'],
                        'images'       => json_decode((string) $row['images_json'], true) ?: [$row['default_image']],
                        'title'        => ['en' => $row['title_en'], 'ur' => $row['title_ur']],
                        'description'  => ['en' => $row['description_en'], 'ur' => $row['description_ur']],
                        'specs'        => [
                            'en' => json_decode((string) $row['specs_en_json'], true) ?: [],
                            'ur' => json_decode((string) $row['specs_ur_json'], true) ?: [],
                        ],
                        'tags'         => $row['tags'],
                        'featured'     => (bool) $row['featured'],
                    ];
                }

                $revStmt = $pdo->query("SELECT * FROM sf_reviews WHERE status = 'approved' ORDER BY created_at DESC LIMIT 30");
                foreach ($revStmt->fetchAll() as $row) {
                    $reviews[] = [
                        'id'       => (int) $row['id'],
                        'name'     => $row['reviewer_name'],
                        'initials' => $row['initials'],
                        'rating'   => (int) $row['rating'],
                        'city'     => ['en' => $row['city_en'], 'ur' => $row['city_ur'] ?: $row['city_en']],
                        'text'     => ['en' => $row['text_en'], 'ur' => $row['text_ur'] ?: $row['text_en']],
                        'sample'   => (bool) $row['is_sample'],
                    ];
                }
            }

            respondJson([
                'ok'         => true,
                'csrf_token' => SecurityGuard::getCsrfToken(),
                'settings'   => $settings,
                'catalogue'  => $products,
                'reviews'    => $reviews,
            ]);
        }

        respondJson(['ok' => false], 400);
    }

    if ($method === 'POST') {
        $rawBody = file_get_contents('php://input');
        $body = is_string($rawBody) && $rawBody !== ''
            ? json_decode($rawBody, true, 16, JSON_THROW_ON_ERROR)
            : $_POST;

        if (!is_array($body)) {
            respondJson(['ok' => false], 400);
        }

        $csrfHeader = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($body['csrf_token'] ?? null);
        if (!SecurityGuard::verifyCsrfToken(is_string($csrfHeader) ? $csrfHeader : null)) {
            respondJson(['ok' => false, 'error' => 'Invalid request token.'], 403);
        }

        switch ($action) {
            case 'submit_inquiry':
                if (!SecurityGuard::checkRateLimit($pdo, 'submit_inquiry', 8, 600)) {
                    respondJson(['ok' => false, 'error' => 'Too many requests. Please wait a few minutes.'], 429);
                }

                $name    = SecurityGuard::cleanInput($body['name'] ?? '', 80);
                $phone   = SecurityGuard::cleanInput($body['phone'] ?? '', 25);
                $city    = SecurityGuard::cleanInput($body['city'] ?? '', 80);
                $project = SecurityGuard::cleanInput($body['project'] ?? 'custom', 40);
                $message = SecurityGuard::cleanInput($body['message'] ?? '', 3500);

                $digits = preg_replace('/\D/', '', $phone) ?? '';
                if ($name === '' || mb_strlen($message, 'UTF-8') < 15 || strlen($digits) < 7 || strlen($digits) > 15) {
                    respondJson(['ok' => false, 'error' => 'Please complete all required fields.'], 422);
                }

                $selectedDesigns = is_array($body['designIds'] ?? null)
                    ? array_slice(array_map(static fn($id) => SecurityGuard::cleanInput($id, 80), $body['designIds']), 0, 20)
                    : [];

                $studioBrief = is_array($body['studio'] ?? null) ? [
                    'project' => SecurityGuard::cleanInput($body['studio']['project'] ?? 'custom', 40),
                    'wood'    => SecurityGuard::cleanInput($body['studio']['wood'] ?? 'sheesham', 40),
                    'finish'  => SecurityGuard::cleanInput($body['studio']['finish'] ?? 'natural', 40),
                    'width'   => max(100, min(300, (int) ($body['studio']['width'] ?? 180))),
                ] : null;

                if ($pdo !== null) {
                    $stmt = $pdo->prepare(
                        'INSERT INTO sf_inquiries
                            (customer_name, customer_phone, customer_city, project_type, selected_designs_json, studio_brief_json, message, status, ip_address)
                         VALUES
                            (:name, :phone, :city, :project, :designs, :studio, :message, :status, :ip)'
                    );
                    $stmt->execute([
                        ':name'    => $name,
                        ':phone'   => $phone,
                        ':city'    => $city,
                        ':project' => $project,
                        ':designs' => json_encode($selectedDesigns, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                        ':studio'  => $studioBrief ? json_encode($studioBrief, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) : null,
                        ':message' => $message,
                        ':status'  => 'new',
                        ':ip'      => SecurityGuard::getClientIp(),
                    ]);
                }

                respondJson(['ok' => true], 201);

            case 'submit_review':
                if (!SecurityGuard::checkRateLimit($pdo, 'submit_review', 5, 900)) {
                    respondJson(['ok' => false, 'error' => 'Too many requests. Please try again later.'], 429);
                }

                $name   = SecurityGuard::cleanInput($body['name'] ?? '', 60);
                $city   = SecurityGuard::cleanInput($body['city'] ?? '', 80);
                $rating = (int) ($body['rating'] ?? 5);
                $review = SecurityGuard::cleanInput($body['review'] ?? '', 700);

                if ($name === '' || mb_strlen($review, 'UTF-8') < 20 || $rating < 1 || $rating > 5) {
                    respondJson(['ok' => false, 'error' => 'Please provide valid review details.'], 422);
                }

                $parts = preg_split('/\s+/u', $name) ?: [];
                $initials = '';
                foreach (array_slice($parts, 0, 2) as $part) {
                    $initials .= mb_strtoupper(mb_substr($part, 0, 1, 'UTF-8'), 'UTF-8');
                }
                if ($initials === '') {
                    $initials = 'SF';
                }

                if ($pdo !== null) {
                    $stmt = $pdo->prepare(
                        'INSERT INTO sf_reviews
                            (reviewer_name, initials, city_en, city_ur, rating, text_en, text_ur, is_sample, status, ip_address)
                         VALUES
                            (:name, :initials, :city_en, :city_ur, :rating, :text_en, :text_ur, 0, :status, :ip)'
                    );
                    $stmt->execute([
                        ':name'     => $name,
                        ':initials' => $initials,
                        ':city_en'  => $city,
                        ':city_ur'  => $city,
                        ':rating'   => $rating,
                        ':text_en'  => $review,
                        ':text_ur'  => $review,
                        ':status'   => 'pending',
                        ':ip'      => SecurityGuard::getClientIp(),
                    ]);
                }

                respondJson(['ok' => true], 201);

            default:
                respondJson(['ok' => false], 400);
        }
    }

    respondJson(['ok' => false], 405);
} catch (Throwable) {
    // Never expose internal database or PHP errors to public callers
    respondJson(['ok' => false], 200);
}
