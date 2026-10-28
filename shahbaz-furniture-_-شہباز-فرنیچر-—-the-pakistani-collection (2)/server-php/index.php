<?php
declare(strict_types=1);

/**
 * Shahbaz Furniture (شہباز فرنیچر) — Complete A-to-Z Public Storefront (index.php)
 * Target Compatibility: PHP 8.3, PHP 8.4, PHP 8.5+
 * Zero installation required: Edit config.php and upload.
 * Zero public error exposure, zero admin links, automatic MySQL sync.
 */

namespace ShahbazFurniture\Front;

require_once __DIR__ . '/config.php';

use ShahbazFurniture\Core\AppConfig;
use ShahbazFurniture\Core\Database;
use ShahbazFurniture\Core\SecurityGuard;
use Throwable;

SecurityGuard::bootstrap(isJsonApi: false, isAdminRoute: false);

$csrfToken = SecurityGuard::getCsrfToken();
$settings = [
    'brand_en'            => AppConfig::APP_NAME,
    'brand_ur'            => AppConfig::APP_NAME_UR,
    'whatsapp_number'     => AppConfig::DEFAULT_WHATSAPP,
    'phone_display'       => AppConfig::DEFAULT_PHONE,
    'gallery_product_ids' => '["classic-carved-bed","mustard-sectional","grey-bedroom-set","double-entrance-door","island-kitchen","fluted-media-wall"]',
];
$dbProducts = [];
$dbReviews  = [];

try {
    $pdo = Database::getConnection();
    if ($pdo !== null) {
        foreach ($pdo->query('SELECT setting_key, setting_value FROM sf_settings')->fetchAll() as $row) {
            $settings[(string) $row['setting_key']] = (string) $row['setting_value'];
        }

        $stmt = $pdo->query('SELECT * FROM sf_products WHERE is_active = 1 ORDER BY featured DESC, sort_order ASC, created_at DESC');
        foreach ($stmt->fetchAll() as $row) {
            $dbProducts[] = [
                'id'           => (string) $row['id'],
                'category'     => (string) $row['category'],
                'defaultImage' => (string) $row['default_image'],
                'images'       => json_decode((string) $row['images_json'], true) ?: [(string) $row['default_image']],
                'title'        => ['en' => (string) $row['title_en'], 'ur' => (string) $row['title_ur']],
                'description'  => ['en' => (string) $row['description_en'], 'ur' => (string) $row['description_ur']],
                'specs'        => [
                    'en' => json_decode((string) $row['specs_en_json'], true) ?: [],
                    'ur' => json_decode((string) $row['specs_ur_json'], true) ?: [],
                ],
                'tags'         => (string) $row['tags'],
            ];
        }

        $revStmt = $pdo->query("SELECT reviewer_name, initials, city_en, city_ur, rating, review_en, review_ur, is_sample FROM sf_reviews WHERE status = 'approved' ORDER BY created_at DESC LIMIT 30");
        foreach ($revStmt->fetchAll() as $rev) {
            $dbReviews[] = [
                'name'     => (string) $rev['reviewer_name'],
                'initials' => (string) $rev['initials'],
                'rating'   => (int) $rev['rating'],
                'city'     => ['en' => (string) $rev['city_en'], 'ur' => (string) ($rev['city_ur'] ?: $rev['city_en'])],
                'text'     => ['en' => (string) $rev['review_en'], 'ur' => (string) ($rev['review_ur'] ?: $rev['review_en'])],
                'sample'   => ((int) $rev['is_sample']) === 1,
            ];
        }
    }
} catch (Throwable) {
    // Silent fallback to built-in catalogue if database is not yet configured
}

$brandEn = $settings['brand_en'] ?: AppConfig::APP_NAME;
$brandUr = $settings['brand_ur'] ?: AppConfig::APP_NAME_UR;
$phoneDisplay = $settings['phone_display'] ?: AppConfig::DEFAULT_PHONE;
$phoneHref = 'tel:' . preg_replace('/\s+/', '', $phoneDisplay);
$brandParts = explode(' ', $brandEn, 2);
$brandFirst = $brandParts[0] ?: 'Shahbaz';
$brandRest  = strtoupper($brandParts[1] ?? 'FURNITURE');

$sfConfigJson = json_encode([
    'brand'             => $brandEn,
    'brandUrdu'         => $brandUr,
    'whatsappNumber'    => $settings['whatsapp_number'] ?: AppConfig::DEFAULT_WHATSAPP,
    'demo'              => false,
    'designImages'      => new \stdClass(),
    'galleryProductIds' => json_decode($settings['gallery_product_ids'] ?? '[]', true) ?: [
        'classic-carved-bed', 'mustard-sectional', 'grey-bedroom-set',
        'double-entrance-door', 'island-kitchen', 'fluted-media-wall',
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#20241e">
<meta name="description" content="<?= SecurityGuard::escape($brandEn) ?> — Beds, sofas, doors, wardrobes, fitted kitchens and custom woodwork from the photo collection. <?= SecurityGuard::escape($brandUr) ?>: بیڈ، صوفے، دروازے، الماریاں، کچن اور لکڑی کا کام۔">
<title><?= SecurityGuard::escape($brandEn) ?> | <?= SecurityGuard::escape($brandUr) ?> — The Pakistani Collection</title>
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preload" as="image" href="assets/real/photo-21.jpg" fetchpriority="high">
<link rel="stylesheet" href="styles.css">
<script>
window.SF_CSRF_TOKEN = <?= json_encode($csrfToken, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
window.SF_CONFIG = <?= $sfConfigJson ?>;
<?php if (!empty($dbProducts)): ?>
window.SF_CATALOGUE = <?= json_encode($dbProducts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?>;
<?php endif; ?>
<?php if (!empty($dbReviews)): ?>
window.SF_REVIEWS = <?= json_encode($dbReviews, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?>;
<?php endif; ?>
</script>
<?php if (empty($dbProducts)): ?>
<script src="catalogue.js" defer></script>
<?php endif; ?>
<script src="app.js" defer></script>
<script src="feedback.js" defer></script>
</head>
<body>
<svg class="icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 19 19 5M5 5h14v14"/></symbol>
<symbol id="i-next" viewBox="0 0 24 24"><path d="M4 12h16M14 6l6 6-6 6"/></symbol>
<symbol id="i-prev" viewBox="0 0 24 24"><path d="M20 12H4m6-6-6 6 6 6"/></symbol>
<symbol id="i-heart" viewBox="0 0 24 24"><path d="M20.5 4.5a5 5 0 0 0-7 0L12 6l-1.5-1.5a5 5 0 0 0-7 7L12 20l8.5-8.5a5 5 0 0 0 0-7Z"/></symbol>
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></symbol>
<symbol id="i-wa" viewBox="0 0 24 24"><path d="M20.5 11.6a8.6 8.6 0 0 1-12.7 7.5L3 20.5l1.3-4.6a8.6 8.6 0 1 1 16.2-4.3Z"/><path d="M8.3 7.3c-.4.5-.5 1.3-.2 2.1.8 2.1 2.4 3.8 4.6 4.8.8.4 1.6.4 2.2 0l.8-1.1-2-1-1 1c-1.6-.7-2.6-1.8-3.1-3.2l.8-.8-.9-2-.7.2Z"/></symbol>
<symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></symbol>
<symbol id="i-wood" viewBox="0 0 24 24"><path d="M4 3h16v18H4V3Zm4 0v6c0 3 5 3 5 7v5M15 3v4c0 4-4 4-4 7v7M17 12c3 3 0 5 0 9"/></symbol>
<symbol id="i-ruler" viewBox="0 0 24 24"><path d="m3 17 14-14 4 4L7 21l-4-4Zm4-4 2 2m2-6 2 2m2-6 2 2"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.6l-5.7 2.9 1.1-6.3-4.6-4.5 6.4-.9L12 3Z"/></symbol>
<symbol id="i-flower" viewBox="0 0 32 32"><path d="m16 2 4 6 7-1-1 7 6 2-6 4 1 7-7-1-4 6-2-6-7 1 1-7-6-4 6-2-1-7 7 1 2-6Z"/><circle cx="16" cy="16" r="4"/></symbol>
</defs>
</svg>

<a class="skip-link" href="#main">Skip to content · اصل مواد</a>

<div class="topline">
<div class="container">
<span>PAKISTANI CRAFT. PERSONAL BY DESIGN.</span>
<span class="ur" lang="ur" dir="rtl">پاکستانی ہنر، آپ کی پسند</span>
<a href="<?= SecurityGuard::escape($phoneHref) ?>"><?= SecurityGuard::escape($phoneDisplay) ?></a>
</div>
</div>

<header id="site-header" class="site-header">
<div class="header-inner container">
<a class="brand" href="#home" aria-label="<?= SecurityGuard::escape($brandEn) ?> home · <?= SecurityGuard::escape($brandUr) ?>">
<span class="brand-mark">SF<span>PK</span></span>
<span class="brand-name"><?= SecurityGuard::escape($brandFirst) ?><span><?= SecurityGuard::escape($brandRest) ?></span></span>
<span class="brand-urdu ur" lang="ur" dir="rtl"><?= SecurityGuard::escape($brandUr) ?></span>
</a>

<nav id="site-nav" aria-label="Main navigation">
<a href="#collection">Collection<span class="ur" lang="ur" dir="rtl">ہمارے ڈیزائن</span></a>
<a href="#craft">Our craft<span class="ur" lang="ur" dir="rtl">ہمارا ہنر</span></a>
<a href="#studio">Custom made<span class="ur" lang="ur" dir="rtl">آپ کی پسند</span></a>
<a href="#gallery">Lookbook<span class="ur" lang="ur" dir="rtl">ڈیزائن گیلری</span></a>
<a href="#reviews">Reviews<span class="ur" lang="ur" dir="rtl">آپ کی رائے</span></a>
</nav>

<div class="header-actions">
<button type="button" class="saved-open icon-button" aria-label="Saved designs · پسندیدہ ڈیزائن" aria-haspopup="dialog">
<svg aria-hidden="true"><use href="#i-heart"/></svg>
<span data-saved-count>0</span>
</button>
<button type="button" class="button nav-inquiry" data-quote-open aria-haspopup="dialog">
Let’s talk <svg aria-hidden="true"><use href="#i-arrow"/></svg>
</button>
<button id="menu-toggle" type="button" class="menu-toggle" aria-label="Open menu · مینو کھولیں" aria-controls="site-nav" aria-expanded="false">
<span></span><span></span>
</button>
</div>
</div>
</header>

<main id="main">
<section id="home" class="hero" aria-labelledby="hero-title">
<img class="hero-background" src="assets/real/photo-21.jpg" alt="Mustard and cream corner sofa with a black and gold centre table" width="1536" height="1024" fetchpriority="high">
<div class="hero-shade"></div>
<div class="hero-inner container">
<div class="hero-copy">
<p class="eyebrow"><span></span>THE PAKISTANI COLLECTION</p>
<p class="hero-urdu ur" lang="ur" dir="rtl">گھر اپنا، انداز اپنا۔</p>
<h1 id="hero-title">A home.<br>Your style.<br><em>A little Shahbaz.</em></h1>
<p class="hero-description">Statement beds. Comfortable sofas. Doors, wardrobes and kitchens. Choose a photo you love, then make the details your own.</p>
<p class="hero-description-ur ur" lang="ur" dir="rtl">بیڈ، صوفے، دروازے، الماریاں اور کچن۔ اپنی پسند کی تصویر منتخب کریں، تفصیلات ساتھ طے کریں۔</p>
<div class="hero-actions">
<a class="button button-gold" href="#collection">Explore the collection <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
<a class="hero-secondary" href="#studio">Made around you <span class="ur" lang="ur" dir="rtl">جیسا آپ چاہیں</span></a>
</div>
</div>
<div class="hero-bottom">
<span>BEDS / SOFAS / DOORS / KITCHENS</span>
<a href="#collection" class="hero-discover">SCROLL TO DISCOVER <span>↓</span></a>
<div class="hero-edition">
<span class="edition-number">01</span>
<span>THE PHOTO COLLECTION<small class="ur" lang="ur" dir="rtl">اپنے گھر کے لیے اپنی پسند</small></span>
</div>
</div>
</div>
<span class="hero-concept">THE DESIGN PHOTO COLLECTION · منتخب تصویری ڈیزائن</span>
</section>

<div class="signature-strip">
<div class="container">
<span><svg aria-hidden="true"><use href="#i-flower"/></svg>ROOTED IN PAKISTAN</span>
<span class="ur" lang="ur" dir="rtl">روایت بھی، آپ کی پسند بھی</span>
<span>ONE PIECE. OR YOUR WHOLE HOME.</span>
</div>
</div>

<section class="room-edits section container" aria-labelledby="edits-title">
<div class="section-top">
<p class="eyebrow dark"><span></span>SPACES WE CALL HOME</p>
<span class="ur section-urdu" lang="ur" dir="rtl">اپنے گھر کی بات ہی اور ہے</span>
</div>
<h2 id="edits-title" class="sr-only">Find your room · اپنے کمرے کے لیے منتخب کریں</h2>
<div class="room-grid">
<a class="room-card room-wide" href="#collection" data-shop-category="bedroom">
<img src="assets/real/photo-14.jpg" alt="Supplied photograph of a carved wooden bed and matching bedside units" loading="lazy" width="1200" height="900">
<div class="room-card-copy">
<span class="room-number">01 / BEDROOM</span>
<h3>A room of <em>your own.</em></h3>
<span class="ur" lang="ur" dir="rtl">بیڈروم کا اپنا انداز</span>
</div>
<span class="room-arrow"><svg class="inline-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></span>
</a>
<a class="room-card" href="#collection" data-shop-category="doors">
<img src="assets/real/photo-15.jpg" alt="Supplied photograph of a wooden double entrance door" loading="lazy" width="1200" height="900">
<div class="room-card-copy">
<span class="room-number">02 / DOORS</span>
<h3>Make an entrance.</h3>
<span class="ur" lang="ur" dir="rtl">گھر کی خوبصورت دہلیز</span>
</div>
<span class="room-arrow"><svg class="inline-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></span>
</a>
<a class="room-card" href="#collection" data-shop-category="kitchen">
<img src="assets/real/photo-41.jpg" alt="Supplied photograph of fitted kitchen cabinetry" loading="lazy" width="1200" height="900">
<div class="room-card-copy">
<span class="room-number">03 / KITCHENS</span>
<h3>A place for everything.</h3>
<span class="ur" lang="ur" dir="rtl">ہر چیز کے لیے مناسب جگہ</span>
</div>
<span class="room-arrow"><svg class="inline-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></span>
</a>
</div>
</section>

<section id="collection" class="collection section" aria-labelledby="collection-title">
<div class="container">
<div class="section-heading">
<div>
<p class="eyebrow dark"><span></span>THE SHAHBAZ SELECTION</p>
<h2 id="collection-title">Beautifully Pakistani.<br><em>Personally yours.</em></h2>
</div>
<div class="heading-aside">
<h3 class="ur" lang="ur" dir="rtl">پاکستانی ڈیزائن، آپ کی اپنی پسند۔</h3>
<p>Discover the details. Save what you love. Let’s shape the rest around your home.</p>
<p class="ur" lang="ur" dir="rtl">ڈیزائن دیکھیں، پسندیدہ چیزیں محفوظ کریں اور اپنی ضرورت کے مطابق بنوائیں۔</p>
</div>
</div>

<div class="catalogue-tools">
<div class="category-scroll" role="group" aria-label="Furniture categories">
<button type="button" class="active" data-category="all" aria-pressed="true">All designs<span class="ur" lang="ur" dir="rtl">تمام ڈیزائن</span></button>
<button type="button" data-category="bedroom" aria-pressed="false">Bedroom<span class="ur" lang="ur" dir="rtl">بیڈروم</span></button>
<button type="button" data-category="living" aria-pressed="false">Baithak<span class="ur" lang="ur" dir="rtl">بیٹھک</span></button>
<button type="button" data-category="kitchen" aria-pressed="false">Kitchens<span class="ur" lang="ur" dir="rtl">کچن</span></button>
<button type="button" data-category="storage" aria-pressed="false">Storage<span class="ur" lang="ur" dir="rtl">الماری اور کیبنٹ</span></button>
<button type="button" data-category="doors" aria-pressed="false">Doors<span class="ur" lang="ur" dir="rtl">دروازے</span></button>
<button type="button" data-category="custom" aria-pressed="false">Woodwork<span class="ur" lang="ur" dir="rtl">لکڑی کا کام</span></button>
</div>
<div class="catalogue-search-row">
<label class="search-box">
<svg aria-hidden="true"><use href="#i-search"/></svg>
<input id="design-search" type="search" placeholder="Find your design / ڈیزائن تلاش کریں" aria-label="Search designs in English or Urdu" autocomplete="off">
</label>
<label class="sort-box">
<span class="sr-only">Sort designs / ترتیب</span>
<select id="design-sort">
<option value="featured">Featured / منتخب</option>
<option value="az">Name A–Z / نام</option>
</select>
</label>
</div>
</div>

<div class="catalogue-meta">
<span id="design-count" role="status">34 designs</span>
<button type="button" class="saved-open text-button" aria-haspopup="dialog">
<svg aria-hidden="true"><use href="#i-heart"/></svg>
My shortlist <span class="ur" lang="ur" dir="rtl">میری پسند</span>
<span data-saved-count>0</span>
</button>
</div>

<div id="design-grid" class="design-grid" aria-live="polite"></div>

<div class="catalogue-pagination">
<p id="catalogue-shown" role="status"></p>
<button id="catalogue-more" type="button" class="button button-outline">Show more designs · مزید ڈیزائن دیکھیں <svg class="inline-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></button>
</div>

<div id="catalogue-empty" class="empty-state" hidden>
<h3>Nothing matches that search yet.</h3>
<p class="ur" lang="ur" dir="rtl">اس تلاش کے مطابق کوئی ڈیزائن نہیں ملا۔</p>
<button type="button" class="button" data-quote-open>Tell us what you have in mind <svg aria-hidden="true"><use href="#i-arrow"/></svg></button>
</div>
</div>
</section>

<section id="craft" class="craft section" aria-labelledby="craft-title">
<div class="craft-layout container">
<div class="craft-images">
<figure class="craft-primary">
<img src="assets/real/photo-35.jpg" alt="Supplied photograph of carved wooden beds with pastel tufted upholstery" loading="lazy" width="1200" height="900">
<figcaption>CARVED DETAIL · نفیس نقش و نگار</figcaption>
</figure>
<figure class="craft-secondary">
<img src="assets/real/photo-38.jpg" alt="Supplied photograph of a contemporary media wall with warm lighting" loading="lazy" width="1200" height="900">
<figcaption>MODERN LINES · جدید انداز</figcaption>
</figure>
</div>
<div class="craft-copy">
<p class="eyebrow"><span></span>WHERE TRADITION MEETS TODAY</p>
<h2 id="craft-title">Carved with care.<br><em>Built around your life.</em></h2>
<h3 class="ur" lang="ur" dir="rtl">روایتی نفاست، آج کے گھر کا سکون۔</h3>
<p>From Chinioti-inspired carving to calm media walls and practical kitchens, great woodwork begins with a conversation about your room.</p>
<p class="ur" lang="ur" dir="rtl">چنیوٹی انداز کے نقش و نگار سے لے کر سادہ میڈیا والز اور روزمرہ کے کچن تک، اچھا کام آپ کے کمرے اور ضرورت کو سمجھنے سے شروع ہوتا ہے۔</p>

<div class="craft-points">
<div>
<span>01</span>
<h4>Start with a look</h4>
<p class="ur" lang="ur" dir="rtl">اپنی پسند کا انداز چنیں</p>
</div>
<div>
<span>02</span>
<h4>Shape the details</h4>
<p class="ur" lang="ur" dir="rtl">ناپ، لکڑی اور پالش طے کریں</p>
</div>
<div>
<span>03</span>
<h4>Confirm together</h4>
<p class="ur" lang="ur" dir="rtl">قیمت اور وقت واضح طور پر طے کریں</p>
</div>
</div>

<button type="button" class="button button-gold" data-quote-open>Start a conversation <span class="ur" lang="ur" dir="rtl">بات شروع کریں</span> <svg aria-hidden="true"><use href="#i-arrow"/></svg></button>
</div>
</div>
</section>

<section id="studio" class="studio section" aria-labelledby="studio-heading">
<div class="container studio-grid">
<div class="studio-intro">
<p class="eyebrow dark"><span></span>MADE AROUND YOU</p>
<h2 id="studio-heading">Your room.<br>Your wood.<br><em>Your way.</em></h2>
<h3 class="ur" lang="ur" dir="rtl">آپ کا کمرہ، آپ کی پسند کی لکڑی اور پالش۔</h3>
<p>Choose your starting point and add it to a clear WhatsApp brief.</p>
<p class="ur" lang="ur" dir="rtl">اپنی پسند کا انتخاب کریں اور اسے واضح پیغام کی صورت میں تیار کریں۔</p>

<form id="studio-form" class="studio-form" novalidate>
<div class="field">
<label for="studio-project">What are we making? <span class="ur" lang="ur" dir="rtl">کیا بنوانا ہے؟</span></label>
<select id="studio-project" name="project">
<option value="living">Baithak &amp; seating / بیٹھک</option>
<option value="bedroom">Bedroom furniture / بیڈروم</option>
<option value="kitchen">Kitchen cabinetry / کچن کیبنٹ</option>
<option value="storage">Wardrobes &amp; media wall / الماری اور میڈیا وال</option>
<option value="doors">Entrance or room doors / دروازے</option>
<option value="office">Study &amp; office / مطالعہ اور دفتر</option>
<option value="custom">Custom woodwork / حسبِ فرمائش کام</option>
</select>
</div>

<fieldset class="choice-group">
<legend>Preferred wood <span class="ur" lang="ur" dir="rtl">پسندیدہ لکڑی</span></legend>
<label><input type="radio" name="wood" value="sheesham" checked><span>Sheesham<small class="ur" lang="ur" dir="rtl">شیشم</small></span></label>
<label><input type="radio" name="wood" value="deodar"><span>Deodar<small class="ur" lang="ur" dir="rtl">دیودار</small></span></label>
<label><input type="radio" name="wood" value="ash"><span>Ash<small class="ur" lang="ur" dir="rtl">ایش</small></span></label>
</fieldset>

<fieldset class="choice-group">
<legend>Polish &amp; tone <span class="ur" lang="ur" dir="rtl">پالش کا رنگ</span></legend>
<label><input type="radio" name="finish" value="natural" checked><span>Natural<small class="ur" lang="ur" dir="rtl">قدرتی</small></span></label>
<label><input type="radio" name="finish" value="walnut"><span>Walnut<small class="ur" lang="ur" dir="rtl">اخروٹی</small></span></label>
<label><input type="radio" name="finish" value="dark"><span>Deep dark<small class="ur" lang="ur" dir="rtl">گہرا</small></span></label>
</fieldset>

<div class="field">
<div class="range-label">
<label for="studio-width">Approximate width <span class="ur" lang="ur" dir="rtl">اندازاً چوڑائی</span></label>
<output id="studio-width-output" for="studio-width">180 cm</output>
</div>
<input id="studio-width" type="range" min="90" max="320" step="10" value="180">
</div>

<button id="studio-inquire" type="button" class="button button-dark">Add to my inquiry <span class="ur" lang="ur" dir="rtl">اپنی تفصیل میں شامل کریں</span> <svg aria-hidden="true"><use href="#i-arrow"/></svg></button>
</form>
</div>

<div class="studio-card" aria-live="polite">
<img id="studio-preview-image" src="assets/real/photo-21.jpg" alt="Selected design preview" loading="lazy" width="1200" height="900">
<div class="studio-card-body">
<span class="eyebrow">YOUR BRIEF</span>
<h3 id="studio-title">Living &amp; baithak</h3>
<p id="studio-summary"></p>
<p id="studio-note" class="studio-note"></p>
</div>
</div>
</div>
</section>

<section id="gallery" class="lookbook section" aria-labelledby="gallery-heading">
<div class="container">
<div class="section-heading">
<div>
<p class="eyebrow dark"><span></span>THE LOOKBOOK</p>
<h2 id="gallery-heading">See how a room<br><em>comes together.</em></h2>
</div>
<div class="heading-aside">
<h3 class="ur" lang="ur" dir="rtl">مختلف کمروں کے لیے خوبصورت خیالات۔</h3>
<div class="lookbook-controls">
<span id="gallery-index">01 / 06</span>
<button id="gallery-prev" type="button" class="circle-button" aria-label="Previous design / پچھلی تصویر"><svg aria-hidden="true"><use href="#i-prev"/></svg></button>
<button id="gallery-next" type="button" class="circle-button" aria-label="Next design / اگلی تصویر"><svg aria-hidden="true"><use href="#i-next"/></svg></button>
</div>
</div>
</div>

<div id="gallery-stage" class="lookbook-stage">
<div class="lookbook-photo">
<img id="gallery-image" src="assets/real/photo-09.jpg" alt="Featured furniture photograph" loading="lazy" width="1400" height="950">
<span class="concept-tag">DESIGN PHOTO · ڈیزائن کی تصویر</span>
</div>
<div class="lookbook-caption">
<p class="eyebrow dark">FEATURED PHOTOGRAPH</p>
<h3 id="gallery-title">Classic Carved Bed</h3>
<p id="gallery-caption"></p>
<div class="lookbook-actions">
<button type="button" class="button button-dark" data-quote-open>Ask about this look <svg aria-hidden="true"><use href="#i-arrow"/></svg></button>
<div id="gallery-dots" class="gallery-dots" aria-label="Choose lookbook photograph"></div>
</div>
</div>
</div>
</div>
</section>

<section id="team" class="guidance section" aria-labelledby="team-heading">
<div class="container">
<div class="section-heading">
<div>
<p class="eyebrow dark"><span></span>HERE WHEN YOU NEED US</p>
<h2 id="team-heading">Good work starts<br>with <em>good guidance.</em></h2>
</div>
<div class="heading-aside">
<h3 class="ur" lang="ur" dir="rtl">صحیح مشورہ، بہتر انتخاب۔</h3>
<p>Discuss your design, materials or project plan.</p>
<p class="ur" lang="ur" dir="rtl">ڈیزائن، لکڑی یا اپنے کام کی منصوبہ بندی پر بات کریں۔</p>
</div>
</div>
<div id="team-grid" class="team-grid"></div>
<p class="section-disclosure">Choose the kind of guidance you need; these buttons prepare an inquiry for <?= SecurityGuard::escape($brandEn) ?>. <span class="ur" lang="ur" dir="rtl">اپنی ضرورت کی رہنمائی منتخب کریں؛ ان بٹنوں سے شہباز فرنیچر کے لیے درخواست تیار ہوتی ہے۔</span></p>
</div>
</section>

<section id="reviews" class="reviews section" aria-labelledby="reviews-heading">
<div class="container">
<div class="section-heading">
<div>
<p class="eyebrow"><span></span>THE WAY A HOME SHOULD FEEL</p>
<h2 id="reviews-heading">A little comfort.<br><em>A lot of apnapan.</em></h2>
</div>
<div class="heading-aside">
<h3 class="ur" lang="ur" dir="rtl">اپنے گھر کی اپنی بات۔</h3>
<p>Explore sample feedback, or add a review in your browser session.</p>
<button id="review-open" type="button" class="button button-gold" aria-haspopup="dialog">Write a review <span class="ur" lang="ur" dir="rtl">اپنی رائے دیں</span> <svg class="inline-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></button>
</div>
</div>

<div id="reviews-track" class="reviews-track" role="region" aria-label="Reviews / آراء" tabindex="0"></div>

<div class="reviews-bottom">
<p id="reviews-status" role="status"></p>
<div class="reviews-navigation">
<span id="reviews-index">1 / 3</span>
<button id="reviews-prev" type="button" class="circle-button" aria-label="Previous review / پچھلی رائے"><svg aria-hidden="true"><use href="#i-prev"/></svg></button>
<button id="reviews-next" type="button" class="circle-button" aria-label="Next review / اگلی رائے"><svg aria-hidden="true"><use href="#i-next"/></svg></button>
</div>
</div>
</div>
</section>

<section id="faq" class="faq section container" aria-labelledby="faq-title">
<div class="faq-heading">
<p class="eyebrow dark"><span></span>A FEW DETAILS, CLEARED UP</p>
<h2 id="faq-title">Ask away.<br><em>We’re listening.</em></h2>
<h3 class="ur" lang="ur" dir="rtl">آپ کے سوال، ہمارے جواب۔</h3>
<a data-wa href="#contact" class="text-button">Ask on WhatsApp <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
</div>
<div class="faq-list">
<details>
<summary><span>Can I change the size or design?<small class="ur" lang="ur" dir="rtl">کیا سائز اور ڈیزائن بدل سکتے ہیں؟</small></span><i>+</i></summary>
<p>Yes. Share your room dimensions and inspiration. Final specifications and feasibility are agreed before the order.</p>
<p class="ur" lang="ur" dir="rtl">جی ہاں۔ کمرے کا ناپ اور پسند بتائیں؛ حتمی ڈیزائن اور بناوٹ آرڈر سے پہلے طے ہوں گے۔</p>
</details>
<details>
<summary><span>How do I get a price?<small class="ur" lang="ur" dir="rtl">قیمت کیسے معلوم ہوگی؟</small></span><i>+</i></summary>
<p>Send the design, size, wood and finish you prefer. A quotation is prepared after discussing these details; no fixed prices are shown for custom work.</p>
<p class="ur" lang="ur" dir="rtl">ڈیزائن، سائز، لکڑی اور پالش کی پسند بتائیں۔ تفصیلات سمجھنے کے بعد قیمت دی جائے گی۔</p>
</details>
<details>
<summary><span>Can I share my own reference photo?<small class="ur" lang="ur" dir="rtl">کیا اپنی پسند کی تصویر بھیج سکتے ہیں؟</small></span><i>+</i></summary>
<p>Absolutely. Open WhatsApp and attach your inspiration photo with your measurements and requirements.</p>
<p class="ur" lang="ur" dir="rtl">بالکل۔ واٹس ایپ پر اپنی پسند کی تصویر، ناپ اور ضرورت کی تفصیل بھیجیں۔</p>
</details>
<details>
<summary><span>What about delivery and installation?<small class="ur" lang="ur" dir="rtl">ترسیل اور تنصیب کا کیا طریقہ ہے؟</small></span><i>+</i></summary>
<p>Share your city and site requirements. Availability, charges, access and installation are confirmed with the quotation.</p>
<p class="ur" lang="ur" dir="rtl">اپنا شہر اور جگہ کی تفصیل بتائیں۔ دستیابی، اخراجات اور تنصیب کی بات قیمت کے ساتھ طے ہوگی۔</p>
</details>
</div>
</section>

<section id="contact" class="contact-section">
<div class="container">
<p class="eyebrow"><span></span>LET’S MAKE SOMETHING PERSONAL</p>
<h2>A little riwayat.<br><em>A whole lot of you.</em></h2>
<p class="ur" lang="ur" dir="rtl">آپ کے گھر کے لیے، آپ کی پسند سے۔</p>
<button type="button" class="button button-gold" data-quote-open>Start your project <span class="ur" lang="ur" dir="rtl">اپنا کام شروع کریں</span> <svg aria-hidden="true"><use href="#i-arrow"/></svg></button>
<a class="contact-phone" href="<?= SecurityGuard::escape($phoneHref) ?>"><?= SecurityGuard::escape($phoneDisplay) ?></a>
</div>
<svg class="contact-flower" aria-hidden="true"><use href="#i-flower"/></svg>
</section>
</main>

<footer class="site-footer">
<div class="container footer-grid">
<div>
<a class="brand" href="#home">
<span class="brand-mark">SF<span>PK</span></span>
<span class="brand-name"><?= SecurityGuard::escape($brandFirst) ?><span><?= SecurityGuard::escape($brandRest) ?></span></span>
</a>
<p>Pakistani roots. Furniture with character.</p>
<p class="ur" lang="ur" dir="rtl">روایتی ہنر، اپنائیت کا احساس۔</p>
</div>
<div class="footer-links">
<h3>EXPLORE / دیکھیں</h3>
<a href="#collection">Our collection · ہمارے ڈیزائن</a>
<a href="#studio">Custom furniture · اپنی پسند</a>
<a href="#team">Our people · رہنمائی</a>
<a href="#faq">FAQs · سوالات</a>
</div>
<div class="footer-contact">
<h3>LET’S TALK / بات کریں</h3>
<a href="<?= SecurityGuard::escape($phoneHref) ?>"><?= SecurityGuard::escape($phoneDisplay) ?></a>
<a data-wa href="#contact">WhatsApp inquiries <svg class="inline-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></a>
<p class="ur" lang="ur" dir="rtl">اپنا ڈیزائن اور ناپ ہمیں بھیجیں۔</p>
</div>
</div>
<div class="footer-bottom container">
<span>© <span data-year>2026</span> <?= SecurityGuard::escape($brandEn) ?>.</span>
<span>Design photographs · Customer reviews</span>
<a href="https://wzdev.pk" target="_blank" rel="noopener noreferrer">Website by WZDEV <svg class="inline-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></a>
</div>
</footer>

<a class="creator-float" title="Created by WZDEV · wzdev.pk" href="https://wzdev.pk" target="_blank" rel="noopener noreferrer" aria-label="Website created by WZDEV — visit wzdev.pk">
<span class="creator-monogram">WZ</span>
<span>
<small>CRAFTED BY</small>
<strong>WZDEV <b><svg class="inline-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></b></strong>
</span>
</a>

<a class="whatsapp-float" data-wa href="#contact" aria-label="Chat with <?= SecurityGuard::escape($brandEn) ?> on WhatsApp · واٹس ایپ پر بات کریں">
<svg aria-hidden="true"><use href="#i-wa"/></svg>
<span>Let’s talk<small class="ur" lang="ur" dir="rtl">واٹس ایپ پر بات کریں</small></span>
</a>

<div id="toast" class="toast" role="status" aria-live="polite" aria-atomic="true"></div>

<dialog id="design-dialog" class="design-dialog" aria-labelledby="detail-title">
<button type="button" class="dialog-close" data-close-dialog aria-label="Close / بند کریں">×</button>
<div class="detail-layout">
<div class="detail-photo">
<img id="detail-image" src="assets/real/photo-09.jpg" alt="Selected design" width="1200" height="900">
<div class="detail-photo-toolbar">
<span id="detail-photo-count">1 / 1</span>
<a id="detail-fullsize" href="assets/real/photo-09.jpg" target="_blank" rel="noopener noreferrer">View full photo · پوری تصویر</a>
</div>
<div id="detail-thumbnails" class="detail-thumbnails" aria-label="Additional design photographs" hidden></div>
<span class="concept-tag">PHOTO REFERENCE · ڈیزائن کی تصویر</span>
</div>
<div class="detail-content">
<p id="detail-category" class="eyebrow dark">Bedroom</p>
<h2 id="detail-title">Design title</h2>
<p id="detail-description"></p>
<ul id="detail-specs"></ul>
<p class="detail-note">Final wood, size, price and timing are confirmed before the order.<span class="ur" lang="ur" dir="rtl">آرڈر سے پہلے لکڑی، سائز، قیمت اور وقت کی تصدیق کریں۔</span></p>
<button id="detail-inquire" type="button" class="button button-dark">Discuss this design <span class="ur" lang="ur" dir="rtl">اس ڈیزائن پر بات کریں</span> <svg class="inline-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></button>
<button id="detail-save" type="button" class="text-button" aria-pressed="false">Save design</button>
</div>
</div>
</dialog>

<dialog id="saved-dialog" class="saved-dialog" aria-labelledby="saved-title">
<button type="button" class="dialog-close" data-close-dialog aria-label="Close / بند کریں">×</button>
<p class="eyebrow dark">YOUR PERSONAL SELECTION</p>
<h2 id="saved-title">The ones you love.</h2>
<h3 class="ur dialog-urdu" lang="ur" dir="rtl">آپ کے پسندیدہ ڈیزائن</h3>
<p>Keep your ideas together and include them in one inquiry.</p>
<div id="saved-items" class="saved-items"></div>
<div class="saved-actions">
<button id="saved-inquire" type="button" class="button button-dark">Discuss my shortlist · میری پسند پر بات کریں <svg class="inline-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></button>
<button id="saved-clear" type="button" class="text-button">Clear all · فہرست خالی کریں</button>
</div>
</dialog>

<dialog id="quote-dialog" class="quote-dialog" aria-labelledby="quote-title">
<button type="button" class="dialog-close" data-close-dialog aria-label="Close / بند کریں">×</button>
<p class="eyebrow dark">A LITTLE DETAIL GOES A LONG WAY</p>
<h2 id="quote-title">Let’s shape your idea.</h2>
<h3 class="ur dialog-urdu" lang="ur" dir="rtl">اپنی پسند اور ضرورت بتائیں۔</h3>
<p>Prepare your inquiry, review it, then continue on WhatsApp.</p>
<p class="ur" lang="ur" dir="rtl">اپنا پیغام تیار کریں، پڑھیں، پھر واٹس ایپ پر جاری رکھیں۔</p>
<p id="quote-selection" class="quote-selection"></p>

<form id="quote-form" novalidate>
<div class="form-row">
<div class="field">
<label for="quote-name">Your name * <span class="ur" lang="ur" dir="rtl">آپ کا نام</span></label>
<input id="quote-name" name="name" required maxlength="80" autocomplete="name" placeholder="Ahmed Ali / احمد علی">
</div>
<div class="field">
<label for="quote-phone">Phone / WhatsApp * <span class="ur" lang="ur" dir="rtl">فون نمبر</span></label>
<input id="quote-phone" name="phone" type="tel" required maxlength="25" autocomplete="tel" placeholder="03XX XXX XXXX">
</div>
</div>
<div class="form-row">
<div class="field">
<label for="quote-city">Your city <span class="ur" lang="ur" dir="rtl">آپ کا شہر</span></label>
<input id="quote-city" name="city" maxlength="80" autocomplete="address-level2" placeholder="Lahore / لاہور">
</div>
<div class="field">
<label for="quote-project">Project type * <span class="ur" lang="ur" dir="rtl">کام کی قسم</span></label>
<select id="quote-project" name="project" required>
<option value="" selected disabled>Choose / منتخب کریں</option>
<option value="living">Baithak &amp; seating / بیٹھک</option>
<option value="bedroom">Bedroom / بیڈروم</option>
<option value="kitchen">Kitchen cabinetry / کچن کیبنٹ</option>
<option value="storage">Wardrobes &amp; storage / الماری</option>
<option value="doors">Doors / دروازے</option>
<option value="office">Study &amp; office / دفتر</option>
<option value="custom">Custom woodwork / خاص لکڑی کا کام</option>
</select>
</div>
</div>
<div class="field">
<label for="quote-message">Your idea and requirements * <span class="ur" lang="ur" dir="rtl">آپ کی پسند اور ضرورت</span></label>
<textarea id="quote-message" name="message" required minlength="15" maxlength="3500" rows="4" placeholder="Design, size, wood, finish, budget in PKR… / ڈیزائن، ناپ، لکڑی اور بجٹ…"></textarea>
</div>
<button class="button button-dark" type="submit">Review my inquiry · اپنا پیغام دیکھیں <svg class="inline-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></button>
</form>

<div id="quote-preview" class="quote-preview" hidden>
<p class="eyebrow dark">YOUR INQUIRY / آپ کا پیغام</p>
<pre id="quote-summary" dir="ltr"></pre>
<div class="quote-preview-actions">
<a id="quote-wa" class="button button-green" href="#contact"><svg aria-hidden="true"><use href="#i-wa"/></svg>Continue on WhatsApp</a>
<button id="quote-copy" class="button button-outline" type="button">Copy message · کاپی کریں</button>
</div>
</div>
<p id="quote-status" class="form-status" role="status" aria-live="polite"></p>
</dialog>

<dialog id="review-dialog" class="review-dialog" aria-labelledby="review-title">
<button type="button" class="dialog-close" data-close-dialog aria-label="Close / بند کریں">×</button>
<p class="eyebrow dark">YOUR THOUGHTS MATTER</p>
<h2 id="review-title">A word from you.</h2>
<h3 class="ur dialog-urdu" lang="ur" dir="rtl">اپنی رائے بتائیں۔</h3>
<p>Share your experience or your thoughts on our furniture designs.</p>
<p class="ur" lang="ur" dir="rtl">ہمارے فرنیچر ڈیزائن کے بارے میں اپنا تجربہ یا رائے تحریر کریں۔</p>
<form id="review-form" novalidate>
<div class="form-row">
<div class="field">
<label for="review-name">Your name * <span class="ur" lang="ur" dir="rtl">آپ کا نام</span></label>
<input id="review-name" name="name" required maxlength="60">
</div>
<div class="field">
<label for="review-city">Your city <span class="ur" lang="ur" dir="rtl">آپ کا شہر</span></label>
<input id="review-city" name="city" maxlength="80">
</div>
</div>
<div class="field">
<label for="review-rating">Your rating * <span class="ur" lang="ur" dir="rtl">درجہ بندی</span></label>
<select id="review-rating" name="rating" required>
<option value="5">5 — Excellent / بہترین</option>
<option value="4">4 — Very good / بہت اچھا</option>
<option value="3">3 — Good / اچھا</option>
<option value="2">2 — Fair / مناسب</option>
<option value="1">1 — Needs improvement / بہتری کی ضرورت</option>
</select>
</div>
<div class="field">
<label for="review-message">Your review * <span class="ur" lang="ur" dir="rtl">آپ کا تبصرہ</span></label>
<textarea id="review-message" name="review" required minlength="20" maxlength="700" rows="4" placeholder="Your experience or design preference… / آپ کی رائے…"></textarea>
</div>
<button class="button button-dark" type="submit">Add my review · رائے شامل کریں</button>
</form>
</dialog>
</body>
</html>
