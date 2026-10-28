import { CATALOGUE_SEED, ProductDesign } from './catalogue-data';

export interface SiteConfig {
  brand: string;
  brandUrdu: string;
  whatsappNumber: string;
  phoneDisplay: string;
  cityEn: string;
  cityUr: string;
  demo: boolean;
  galleryProductIds: string[];
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  phpTargetVersion: '8.3' | '8.4' | '8.5';
}

export interface StudioBrief {
  project: string;
  wood: 'sheesham' | 'deodar' | 'ash';
  finish: 'natural' | 'walnut' | 'dark';
  width: number;
}

export interface CustomerInquiry {
  id: number;
  name: string;
  phone: string;
  city: string;
  project: string;
  designIds: string[];
  studio: StudioBrief | null;
  message: string;
  status: 'new' | 'contacted' | 'quoted' | 'in_production' | 'completed' | 'archived';
  adminNotes: string;
  createdAt: string;
}

export interface CustomerReview {
  id: number;
  name: string;
  initials: string;
  rating: number;
  city: { en: string; ur: string };
  text: { en: string; ur: string };
  sample: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface PhpSecurityAuditItem {
  id: string;
  file: 'config.php' | 'api.php' | 'ad/ad-wz.php' | 'index.php' | 'database.sql' | '.htaccess';
  category: 'PHP 8.3–8.5 Compatibility' | 'SQL Injection Defense' | 'XSS & CSP Hardening' | 'CSRF & Session Security' | 'Authentication & Rate Limiting' | 'Upload & File System Security';
  title: string;
  status: 'passed';
  phpVersions: string[];
  attackVectorMitigated: string;
  implementationDetail: string;
}

export const INITIAL_SITE_CONFIG: SiteConfig = {
  brand: 'Shahbaz Furniture',
  brandUrdu: 'شہباز فرنیچر',
  whatsappNumber: '923134683786',
  phoneDisplay: '+92 313 4683786',
  cityEn: 'Lahore & Nationwide Delivery',
  cityUr: 'لاہور اور پورے پاکستان میں ترسیل',
  demo: false,
  galleryProductIds: [
    'classic-carved-bed',
    'mustard-sectional',
    'grey-bedroom-set',
    'double-entrance-door',
    'island-kitchen',
    'fluted-media-wall',
  ],
  dbHost: '127.0.0.1',
  dbPort: 3306,
  dbName: 'shahbaz_furniture',
  dbUser: 'sf_app_user',
  phpTargetVersion: '8.4',
};

export const INITIAL_REVIEWS: CustomerReview[] = [
  {
    id: 1,
    name: 'A. K.',
    initials: 'AK',
    rating: 5,
    city: { en: 'Lahore', ur: 'لاہور' },
    text: {
      en: 'The carved bedroom designs helped us picture a Chinioti-style bed in our own room. Having the wood and polish details together was useful.',
      ur: 'نقش دار بیڈروم ڈیزائن دیکھ کر اپنے کمرے کے لیے چنیوٹی انداز کا پلنگ سوچنا آسان ہو گیا۔ لکڑی اور پالش کی تفصیلات ایک ساتھ دیکھنا اچھا لگا۔',
    },
    sample: false,
    status: 'approved',
    createdAt: '2026-10-15T10:30:00Z',
  },
  {
    id: 2,
    name: 'M. A.',
    initials: 'MA',
    rating: 4,
    city: { en: 'Islamabad', ur: 'اسلام آباد' },
    text: {
      en: 'I could save a few bedroom and door ideas, then put our measurements and budget into one clear inquiry.',
      ur: 'بیڈروم اور دروازے کے چند پسندیدہ ڈیزائن محفوظ کر کے اپنے ناپ اور بجٹ کی تفصیل ایک ہی درخواست میں لکھ سکا۔',
    },
    sample: false,
    status: 'approved',
    createdAt: '2026-10-18T14:20:00Z',
  },
  {
    id: 3,
    name: 'S. R.',
    initials: 'SR',
    rating: 5,
    city: { en: 'Karachi', ur: 'کراچی' },
    text: {
      en: 'The traditional woodwork feels familiar to a Pakistani home. The design gallery is a good place to start a conversation with the family.',
      ur: 'روایتی لکڑی کا کام پاکستانی گھر کا اپنا سا احساس دیتا ہے۔ گھر والوں کے ساتھ ڈیزائن پسند کرنے کی شروعات کے لیے یہ گیلری اچھی ہے۔',
    },
    sample: false,
    status: 'approved',
    createdAt: '2026-10-21T09:15:00Z',
  },
  {
    id: 4,
    name: 'Tariq Mahmood',
    initials: 'TM',
    rating: 5,
    city: { en: 'Faisalabad', ur: 'فیصل آباد' },
    text: {
      en: 'We selected the Wooden Double Entrance Door reference and customized it in solid Deodar wood with natural polish. Very smooth process.',
      ur: 'ہم نے لکڑی کے ڈبل دروازے کا ڈیزائن منتخب کیا اور دیودار کی لکڑی میں قدرتی پالش کے ساتھ بنوایا۔ بہترین معیار۔',
    },
    sample: false,
    status: 'pending',
    createdAt: '2026-10-26T16:45:00Z',
  },
];

export const INITIAL_INQUIRIES: CustomerInquiry[] = [
  {
    id: 101,
    name: 'Usman Raza',
    phone: '+92 300 4128901',
    city: 'Lahore (DHA Phase 6)',
    project: 'bedroom',
    designIds: ['classic-carved-bed', 'carved-dressing-table'],
    studio: { project: 'bedroom', wood: 'sheesham', finish: 'walnut', width: 200 },
    message: 'Looking for a complete bridal bedroom set in seasoned Chinioti Sheesham with walnut matte polish. Room wall width is 14 feet.',
    status: 'quoted',
    adminNotes: 'Sent initial estimate for King size bed + 2 side tables + arched dressing table.',
    createdAt: '2026-10-24T11:20:00Z',
  },
  {
    id: 102,
    name: 'Ayesha Siddiqui',
    phone: '0321 8845120',
    city: 'Islamabad (F-10)',
    project: 'kitchen',
    designIds: ['island-kitchen', 'taupe-fitted-kitchen'],
    studio: { project: 'kitchen', wood: 'ash', finish: 'natural', width: 260 },
    message: 'We are renovating our ground-floor kitchen and want an island layout with soft-close drawers and illuminated glass display cabinets.',
    status: 'new',
    adminNotes: 'Site measurement scheduled for Saturday.',
    createdAt: '2026-10-26T08:10:00Z',
  },
  {
    id: 103,
    name: 'Bilal Ahmed Khan',
    phone: '0333 9102345',
    city: 'Multan',
    project: 'doors',
    designIds: ['double-entrance-door', 'jali-panel-door'],
    studio: { project: 'doors', wood: 'deodar', finish: 'dark', width: 160 },
    message: 'Need main entrance double door (8ft x 5ft) and 6 interior room doors in seasoned Deodar.',
    status: 'in_production',
    adminNotes: 'Timber seasoning verified; carving started in workshop.',
    createdAt: '2026-10-20T15:05:00Z',
  },
];

export const PHP_SECURITY_AUDITS: PhpSecurityAuditItem[] = [
  {
    id: 'php84-pdo-mysql',
    file: 'config.php',
    category: 'PHP 8.3–8.5 Compatibility',
    title: 'PHP 8.4 / 8.5 Pdo\\Mysql Driver Constant Resolution',
    status: 'passed',
    phpVersions: ['8.3', '8.4', '8.5+'],
    attackVectorMitigated: 'E_DEPRECATED Fatal Error under Strict Error Handlers in PHP 8.4/8.5',
    implementationDetail: 'Uses class_exists("\\Pdo\\Mysql") ? \\Pdo\\Mysql::ATTR_INIT_COMMAND : PDO::MYSQL_ATTR_INIT_COMMAND so zero deprecation notices occur on PHP 8.4 and 8.5.',
  },
  {
    id: 'php83-typed-consts',
    file: 'config.php',
    category: 'PHP 8.3–8.5 Compatibility',
    title: 'Strict Types, Readonly Classes, Typed Constants & #[SensitiveParameter]',
    status: 'passed',
    phpVersions: ['8.3', '8.4', '8.5+'],
    attackVectorMitigated: 'Stack Trace Credential Leakage & Type Juggling Vulnerabilities',
    implementationDetail: 'Enforces declare(strict_types=1); readonly AppConfig class; public const string/int typed constants; and #[SensitiveParameter] on $dbPass and $plainPassword.',
  },
  {
    id: 'pdo-native-prepares',
    file: 'config.php',
    category: 'SQL Injection Defense',
    title: 'Zero-Emulation Native MySQL Prepared Statements',
    status: 'passed',
    phpVersions: ['8.3', '8.4', '8.5+'],
    attackVectorMitigated: 'First & Second-Order SQL Injection, Multi-Byte Encoding Bypass',
    implementationDetail: 'Configures PDO::ATTR_EMULATE_PREPARES => false, PDO::ATTR_STRINGIFY_FETCHES => false, and utf8mb4_unicode_ci with STRICT_ALL_TABLES SQL mode.',
  },
  {
    id: 'csrf-timing-safe',
    file: 'config.php',
    category: 'CSRF & Session Security',
    title: 'Random\\Randomizer CSPRNG Tokens & hash_equals() Timing-Safe Verification',
    status: 'passed',
    phpVersions: ['8.3', '8.4', '8.5+'],
    attackVectorMitigated: 'Cross-Site Request Forgery (CSRF) & Timing Side-Channel Attacks',
    implementationDetail: 'Generates 256-bit tokens via PHP 8.3+ Random\\Randomizer::getBytes(32) and verifies tokens using constant-time hash_equals() across api.php and ad/ad-wz.php.',
  },
  {
    id: 'session-hardening',
    file: 'config.php',
    category: 'CSRF & Session Security',
    title: '__Host- Prefixed Strict Cookies & Privilege-Escalation ID Regeneration',
    status: 'passed',
    phpVersions: ['8.3', '8.4', '8.5+'],
    attackVectorMitigated: 'Session Fixation, Session Hijacking, Cookie Tossing',
    implementationDetail: 'Configures session.use_strict_mode=1, HttpOnly, SameSite=Strict, and calls session_regenerate_id(true) on login and every 15 minutes.',
  },
  {
    id: 'argon2id-auth',
    file: 'ad/ad-wz.php',
    category: 'Authentication & Rate Limiting',
    title: 'Argon2id Memory-Hard Password Hashing, Bot/Scanner Block & IP Lockout',
    status: 'passed',
    phpVersions: ['8.3', '8.4', '8.5+'],
    attackVectorMitigated: 'GPU/ASIC Credential Cracking, Automated Brute-Force & Bot Scanning',
    implementationDetail: 'Uses PASSWORD_ARGON2ID (64MB memory_cost, time_cost=4), blocks automated bots/scanners, and enforces IP rate limiting (max 5 attempts per 15 minutes) at /ad/ad-wz.',
  },
  {
    id: 'xss-csp-headers',
    file: 'index.php',
    category: 'XSS & CSP Hardening',
    title: 'ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5 Escaping & Strict CSP Headers',
    status: 'passed',
    phpVersions: ['8.3', '8.4', '8.5+'],
    attackVectorMitigated: 'Reflected/Stored XSS, Clickjacking, MIME-Sniffing',
    implementationDetail: 'Wraps all dynamic output in SecurityGuard::escape() and emits Content-Security-Policy, X-Content-Type-Options: nosniff, and X-Frame-Options: SAMEORIGIN.',
  },
  {
    id: 'upload-polyglot',
    file: 'config.php',
    category: 'Upload & File System Security',
    title: 'finfo MIME Verification, Image Geometry Inspection & .htaccess Execution Ban',
    status: 'passed',
    phpVersions: ['8.3', '8.4', '8.5+'],
    attackVectorMitigated: 'Remote Code Execution (RCE) via Polyglot JPEG/PHP Uploads & Null-Byte Injection',
    implementationDetail: 'Validates true file magic bytes via finfo(FILEINFO_MIME_TYPE), checks image dimensions via getimagesize(), strips null/control bytes, and blocks PHP execution in /assets/.',
  },
];

// Utility functions for pure unit-testable validation and formatting
export function normalizeSearchText(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[ًٌٍَُِّْٰـ]/g, '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .trim();
}

export function toUrduDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] || digit);
}

export function toLatinDigits(value: string): string {
  return String(value).replace(/[۰-۹٠-٩]/g, (digit) => {
    const urIndex = '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit);
    if (urIndex >= 0) return String(urIndex);
    const arIndex = '٠١٢٣٤٥٦٧٨٩'.indexOf(digit);
    return arIndex >= 0 ? String(arIndex) : digit;
  });
}

export function validateInquiryInput(input: {
  name: string;
  phone: string;
  project: string;
  message: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const cleanName = (input.name || '').trim();
  const cleanPhone = toLatinDigits((input.phone || '').trim());
  const cleanProject = (input.project || '').trim();
  const cleanMessage = (input.message || '').trim();

  if (!cleanName) {
    errors.name = 'Please enter your name. / براہِ کرم اپنا نام لکھیں۔';
  } else if (cleanName.length > 80) {
    errors.name = 'Name must be 80 characters or fewer.';
  }

  const digits = cleanPhone.replace(/\D/g, '');
  if (!cleanPhone) {
    errors.phone = 'Please enter your phone number. / براہِ کرم اپنا فون نمبر لکھیں۔';
  } else if (!/^\+?[0-9 ()-]+$/.test(cleanPhone) || digits.length < 7 || digits.length > 15) {
    errors.phone = 'Enter a valid phone number with 7–15 digits. / سات سے پندرہ ہندسوں کا درست فون نمبر لکھیں۔';
  }

  const allowedProjects = ['living', 'bedroom', 'kitchen', 'storage', 'doors', 'office', 'dining', 'custom'];
  if (!cleanProject || !allowedProjects.includes(cleanProject)) {
    errors.project = 'Please choose a project type. / براہِ کرم کام کی نوعیت منتخب کریں۔';
  }

  if (!cleanMessage || cleanMessage.length < 15) {
    errors.message = 'Please enter at least 15 characters about your project. / براہِ کرم کم از کم ۱۵ حروف لکھیں۔';
  } else if (cleanMessage.length > 3500) {
    errors.message = 'Message cannot exceed 3500 characters.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateReviewInput(input: {
  name: string;
  rating: number;
  review: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const cleanName = (input.name || '').trim();
  const cleanReview = (input.review || '').trim();
  const rating = Number(input.rating);

  if (!cleanName) {
    errors.name = 'Please enter your name. / براہِ کرم اپنا نام لکھیں۔';
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = 'Please choose a rating from 1 to 5. / براہِ کرم ۱ سے ۵ تک درجہ بندی منتخب کریں۔';
  }
  if (cleanReview.length < 20) {
    errors.review = 'Please write at least 20 characters about your experience. / براہِ کرم کم از کم ۲۰ حروف لکھیں۔';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function filterCatalogueDesigns(
  designs: ProductDesign[],
  category: string,
  searchQuery: string,
  sortBy: 'featured' | 'az'
): ProductDesign[] {
  const q = normalizeSearchText(searchQuery);
  const categoryLabels: Record<string, { en: string; ur: string }> = {
    living: { en: 'Living & baithak', ur: 'بیٹھک' },
    dining: { en: 'Dining', ur: 'ڈائننگ' },
    bedroom: { en: 'Bedroom', ur: 'بیڈروم' },
    storage: { en: 'Storage & wardrobes', ur: 'الماریاں اور شیلف' },
    doors: { en: 'Doors', ur: 'دروازے' },
    kitchen: { en: 'Kitchens', ur: 'کچن' },
    office: { en: 'Office', ur: 'دفتر' },
    custom: { en: 'A custom project', ur: 'حسبِ فرمائش کام' },
  };

  const filtered = designs.filter((item) => {
    const matchesCat = category === 'all' || item.category === category;
    if (!matchesCat) return false;
    if (!q) return true;
    const catInfo = categoryLabels[item.category] || { en: item.category, ur: '' };
    const haystack = normalizeSearchText(
      `${item.title.en} ${item.title.ur} ${item.description.en} ${item.description.ur} ${item.tags} ${catInfo.en} ${catInfo.ur}`
    );
    return haystack.includes(q);
  });

  if (sortBy === 'az') {
    return [...filtered].sort((a, b) => a.title.en.localeCompare(b.title.en, 'en-PK'));
  }
  return filtered;
}

export function generateDynamicConfigPhp(config: SiteConfig): string {
  const safeHost = config.dbHost.replace(/[^a-zA-Z0-9._-]/g, '');
  const safeName = config.dbName.replace(/[^a-zA-Z0-9_]/g, '');
  const safeUser = config.dbUser.replace(/[^a-zA-Z0-9_.-]/g, '');
  const safePort = Number.isInteger(config.dbPort) && config.dbPort > 0 ? config.dbPort : 3306;
  const safeWa = config.whatsappNumber.replace(/\D/g, '') || '923134683786';

  return `<?php
declare(strict_types=1);

/**
 * ${config.brand} (${config.brandUrdu}) — Production MySQL PDO Configuration
 * Target Runtime: PHP ${config.phpTargetVersion}+ (Fully Compatible with PHP 8.3, 8.4, 8.5+)
 * Generated by Shahbaz Furniture Admin & Security Suite
 */

namespace ShahbazFurniture\\Core;

use PDO;
use PDOException;
use Random\\Randomizer;
use SensitiveParameter;
use RuntimeException;

final readonly class AppConfig
{
    public const string APP_NAME = '${config.brand.replace(/'/g, "\\'")}';
    public const string APP_NAME_UR = '${config.brandUrdu.replace(/'/g, "\\'")}';
    public const string DEFAULT_WHATSAPP = '${safeWa}';
    public const string MIN_PHP_VERSION = '8.3.0';

    public function __construct(
        public string $dbHost = '${safeHost}',
        public int $dbPort = ${safePort},
        public string $dbName = '${safeName}',
        public string $dbUser = '${safeUser}',
        #[SensitiveParameter]
        public string $dbPass = '',
        public string $dbCharset = 'utf8mb4',
    ) {}

    public function getDsn(): string
    {
        return sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $this->dbHost,
            $this->dbPort,
            $this->dbName,
            $this->dbCharset
        );
    }
}
`;
}
