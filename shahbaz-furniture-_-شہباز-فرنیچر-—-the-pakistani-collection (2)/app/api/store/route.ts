import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { CATALOGUE_SEED, ProductDesign } from '@/lib/catalogue-data';
import {
  CustomerInquiry,
  CustomerReview,
  INITIAL_INQUIRIES,
  INITIAL_REVIEWS,
  INITIAL_SITE_CONFIG,
  PHP_SECURITY_AUDITS,
  SiteConfig,
  validateInquiryInput,
  validateReviewInput,
} from '@/lib/store';

interface DatabaseState {
  config: SiteConfig;
  catalogue: ProductDesign[];
  inquiries: CustomerInquiry[];
  reviews: CustomerReview[];
}

const DB_FILE_PATH = '/tmp/sf_production_db.json';
const SESSION_COOKIE_NAME = 'sf_ad_wz_session';
const SESSION_SECRET = process.env.GEMINI_API_KEY || 'sf-private-admin-hmac-key-2026';

// Brute-force login rate limiter per IP (max 5 failed attempts per 15 minutes)
const loginAttemptsMap = new Map<string, { fails: number; lockedUntil: number }>();
// Public form submission rate limiter per IP
const submissionRateMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

function checkSubmissionRate(ip: string, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const mapKey = `${key}:${ip}`;
  const rec = submissionRateMap.get(mapKey);
  if (!rec || now > rec.resetAt) {
    submissionRateMap.set(mapKey, { count: 1, resetAt: now + windowMs });
    return true;
  }
  rec.count += 1;
  return rec.count <= max;
}

function createAdminToken(username: string): string {
  const exp = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  const payload = `${username}|${exp}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

function verifyAdminSession(req: NextRequest): boolean {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value || '';
  if (!token || !token.includes('.')) return false;
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return false;
  try {
    const payload = Buffer.from(b64, 'base64url').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    if (sig.length !== expectedSig.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return false;
    const [, expStr] = payload.split('|');
    const exp = Number(expStr);
    return Number.isFinite(exp) && Date.now() < exp;
  } catch {
    return false;
  }
}

function stripDangerousTags(val: unknown, maxLen = 500): string {
  return String(val ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<[^>]*>?/gm, '')
    .trim()
    .slice(0, maxLen);
}

function loadState(): DatabaseState {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.catalogue)) {
        return parsed;
      }
    }
  } catch {
    // Silent fallback
  }
  const initial: DatabaseState = {
    config: { ...INITIAL_SITE_CONFIG },
    catalogue: [...CATALOGUE_SEED],
    inquiries: [...INITIAL_INQUIRIES],
    reviews: [...INITIAL_REVIEWS],
  };
  saveState(initial);
  return initial;
}

function saveState(state: DatabaseState): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Silent
  }
}

function readPrivatePhpFiles(): Record<string, string> {
  const baseDir = path.join(process.cwd(), 'server-php');
  const files: Record<string, string> = {
    'config.php': path.join(baseDir, 'config.php'),
    'database.sql': path.join(baseDir, 'database.sql'),
    'api.php': path.join(baseDir, 'api.php'),
    'ad/ad-wz.php': path.join(baseDir, 'ad', 'ad-wz.php'),
    'index.php': path.join(baseDir, 'index.php'),
    '.htaccess': path.join(baseDir, '.htaccess'),
  };
  const result: Record<string, string> = {};
  for (const [label, fullPath] of Object.entries(files)) {
    try {
      if (fs.existsSync(fullPath)) {
        result[label] = fs.readFileSync(fullPath, 'utf8');
      }
    } catch {
      result[label] = '';
    }
  }
  return result;
}

function sanitizePublicConfig(cfg: SiteConfig) {
  return {
    brand: cfg.brand,
    brandUrdu: cfg.brandUrdu,
    whatsappNumber: cfg.whatsappNumber,
    phoneDisplay: cfg.phoneDisplay,
    cityEn: cfg.cityEn,
    cityUr: cfg.cityUr,
    demo: false,
    galleryProductIds: cfg.galleryProductIds,
  };
}

export async function GET(req: NextRequest) {
  const state = loadState();
  const scope = req.nextUrl.searchParams.get('scope');

  // Admin scope requires verified HttpOnly session cookie
  if (scope === 'admin') {
    if (!verifyAdminSession(req)) {
      return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      authenticated: true,
      state,
      phpFiles: readPrivatePhpFiles(),
      securityAudits: PHP_SECURITY_AUDITS,
    });
  }

  // Public scope NEVER exposes inquiries, unapproved reviews, DB credentials, or PHP files
  return NextResponse.json({
    ok: true,
    config: sanitizePublicConfig(state.config),
    catalogue: state.catalogue,
    reviews: state.reviews.filter((r) => r.status === 'approved'),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = stripDangerousTags(body?.action, 64);
    const ip = getClientIp(req);
    const state = loadState();

    // -------------------------------------------------------------------------
    // 1. Admin Login & Logout Actions
    // -------------------------------------------------------------------------
    if (action === 'admin_login') {
      // Honeypot check
      if (body.website_url) {
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      }

      const now = Date.now();
      const attempt = loginAttemptsMap.get(ip) || { fails: 0, lockedUntil: 0 };
      if (attempt.lockedUntil > now) {
        return NextResponse.json(
          { ok: false, error: 'Too many failed attempts. Try again in 15 minutes.' },
          { status: 429 }
        );
      }

      const username = stripDangerousTags(body.username, 64);
      const password = String(body.password ?? '');

      const expectedUser = 'admin';
      const expectedPass = 'Shahbaz@2026!';

      const userMatch =
        username.length === expectedUser.length &&
        crypto.timingSafeEqual(Buffer.from(username), Buffer.from(expectedUser));
      const passMatch =
        password.length === expectedPass.length &&
        crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expectedPass));

      if (!userMatch || !passMatch) {
        attempt.fails += 1;
        if (attempt.fails >= 5) {
          attempt.lockedUntil = now + 15 * 60 * 1000;
        }
        loginAttemptsMap.set(ip, attempt);
        return NextResponse.json(
          { ok: false, error: 'Invalid username or password.' },
          { status: 401 }
        );
      }

      loginAttemptsMap.delete(ip);
      const token = createAdminToken(username);
      const res = NextResponse.json({
        ok: true,
        authenticated: true,
        state,
        phpFiles: readPrivatePhpFiles(),
        securityAudits: PHP_SECURITY_AUDITS,
      });
      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 7200,
      });
      return res;
    }

    if (action === 'admin_logout') {
      const res = NextResponse.json({ ok: true, authenticated: false });
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    // -------------------------------------------------------------------------
    // 2. Public Showroom Submissions (Rate-Limited, Sanitized, Zero Private Leak)
    // -------------------------------------------------------------------------
    if (action === 'submit_inquiry') {
      if (!checkSubmissionRate(ip, 'inquiry', 8, 10 * 60 * 1000)) {
        return NextResponse.json(
          { ok: false, error: 'Too many requests. Please wait a few minutes.' },
          { status: 429 }
        );
      }
      const cleanName = stripDangerousTags(body.name, 80);
      const cleanPhone = stripDangerousTags(body.phone, 25);
      const cleanCity = stripDangerousTags(body.city, 80);
      const cleanProject = stripDangerousTags(body.project, 40);
      const cleanMessage = stripDangerousTags(body.message, 3500);

      const validation = validateInquiryInput({
        name: cleanName,
        phone: cleanPhone,
        project: cleanProject,
        message: cleanMessage,
      });
      if (!validation.valid) {
        return NextResponse.json({ ok: false, errors: validation.errors }, { status: 422 });
      }

      const newInquiry: CustomerInquiry = {
        id: Date.now(),
        name: cleanName,
        phone: cleanPhone,
        city: cleanCity,
        project: cleanProject,
        designIds: Array.isArray(body.designIds)
          ? body.designIds.slice(0, 20).map((id: unknown) => stripDangerousTags(id, 80))
          : [],
        studio: body.studio || null,
        message: cleanMessage,
        status: 'new',
        adminNotes: '',
        createdAt: new Date().toISOString(),
      };
      state.inquiries.unshift(newInquiry);
      saveState(state);
      return NextResponse.json({ ok: true });
    }

    if (action === 'submit_review') {
      if (!checkSubmissionRate(ip, 'review', 5, 15 * 60 * 1000)) {
        return NextResponse.json(
          { ok: false, error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
      const cleanName = stripDangerousTags(body.name, 60);
      const cleanCity = stripDangerousTags(body.city, 80);
      const cleanText = stripDangerousTags(body.review, 700);
      const rating = Number(body.rating || 5);

      const validation = validateReviewInput({
        name: cleanName,
        rating,
        review: cleanText,
      });
      if (!validation.valid) {
        return NextResponse.json({ ok: false, errors: validation.errors }, { status: 422 });
      }

      const initials =
        cleanName
          .split(/\s+/)
          .slice(0, 2)
          .map((p) => Array.from(p)[0] || '')
          .join('')
          .toUpperCase() || 'SF';

      const newReview: CustomerReview = {
        id: Date.now(),
        name: cleanName,
        initials,
        rating,
        city: { en: cleanCity || 'Pakistan', ur: cleanCity || 'پاکستان' },
        text: { en: cleanText, ur: cleanText },
        sample: false,
        status: 'approved',
        createdAt: new Date().toISOString(),
      };
      state.reviews.unshift(newReview);
      saveState(state);
      return NextResponse.json({
        ok: true,
        reviews: state.reviews.filter((r) => r.status === 'approved'),
      });
    }

    // -------------------------------------------------------------------------
    // 3. Protected Admin Mutations (Require Verified Admin Cookie)
    // -------------------------------------------------------------------------
    if (!verifyAdminSession(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    switch (action) {
      case 'admin_save_product': {
        const rawId = stripDangerousTags(body.id, 80)
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '');
        const id = rawId || `design-${Date.now()}`;
        const titleEn = stripDangerousTags(body.titleEn, 160);
        const titleUr = stripDangerousTags(body.titleUr, 160) || titleEn;
        const descEn = stripDangerousTags(body.descriptionEn, 1500);
        const descUr = stripDangerousTags(body.descriptionUr, 1500) || descEn;
        const category = body.category || 'bedroom';
        const defaultImage = stripDangerousTags(body.defaultImage || 'assets/real/photo-01.jpg', 255);

        if (!titleEn || !descEn) {
          return NextResponse.json(
            { ok: false, error: 'English title and description are required.' },
            { status: 422 }
          );
        }

        const existingIndex = state.catalogue.findIndex((p) => p.id === id);
        const product: ProductDesign = {
          id,
          category,
          defaultImage,
          images: existingIndex >= 0 ? state.catalogue[existingIndex].images : [defaultImage],
          title: { en: titleEn, ur: titleUr },
          description: { en: descEn, ur: descUr },
          specs: {
            en: [
              'Select this photo as your design reference',
              'Discuss dimensions, materials, upholstery and finish',
              'Price, availability and timeline confirmed before an order',
            ],
            ur: [
              'اس تصویر کو اپنی پسند کے ڈیزائن کے طور پر منتخب کریں',
              'پیمائش، لکڑی، کپڑے اور پالش کی تفصیلات طے کریں',
              'آرڈر سے پہلے قیمت، دستیابی اور وقت کی تصدیق کریں',
            ],
          },
          tags: `${titleEn} ${titleUr} ${category} furniture فرنیچر ڈیزائن`,
          featured: Boolean(body.featured),
        };

        if (existingIndex >= 0) {
          state.catalogue[existingIndex] = product;
        } else {
          state.catalogue.unshift(product);
        }
        saveState(state);
        return NextResponse.json({ ok: true, state });
      }

      case 'admin_delete_product': {
        const id = stripDangerousTags(body.id, 80);
        state.catalogue = state.catalogue.filter((p) => p.id !== id);
        saveState(state);
        return NextResponse.json({ ok: true, state });
      }

      case 'admin_update_inquiry': {
        const id = Number(body.id);
        const target = state.inquiries.find((i) => i.id === id);
        if (target) {
          if (body.status) target.status = body.status;
          if (typeof body.adminNotes === 'string') {
            target.adminNotes = stripDangerousTags(body.adminNotes, 1000);
          }
          saveState(state);
        }
        return NextResponse.json({ ok: true, state });
      }

      case 'admin_delete_inquiry': {
        const id = Number(body.id);
        state.inquiries = state.inquiries.filter((i) => i.id !== id);
        saveState(state);
        return NextResponse.json({ ok: true, state });
      }

      case 'admin_moderate_review': {
        const id = Number(body.id);
        const target = state.reviews.find((r) => r.id === id);
        if (target && ['pending', 'approved', 'rejected'].includes(body.status)) {
          target.status = body.status;
          saveState(state);
        }
        return NextResponse.json({ ok: true, state });
      }

      case 'admin_delete_review': {
        const id = Number(body.id);
        state.reviews = state.reviews.filter((r) => r.id !== id);
        saveState(state);
        return NextResponse.json({ ok: true, state });
      }

      case 'admin_update_config': {
        state.config = {
          ...state.config,
          brand: stripDangerousTags(body.brand || state.config.brand, 80),
          brandUrdu: stripDangerousTags(body.brandUrdu || state.config.brandUrdu, 80),
          whatsappNumber: String(body.whatsappNumber || state.config.whatsappNumber).replace(/\D/g, ''),
          phoneDisplay: stripDangerousTags(body.phoneDisplay || state.config.phoneDisplay, 40),
          cityEn: stripDangerousTags(body.cityEn || state.config.cityEn, 80),
          cityUr: stripDangerousTags(body.cityUr || state.config.cityUr, 80),
          dbHost: stripDangerousTags(body.dbHost || state.config.dbHost, 80),
          dbPort: Number(body.dbPort || state.config.dbPort),
          dbName: stripDangerousTags(body.dbName || state.config.dbName, 80),
          dbUser: stripDangerousTags(body.dbUser || state.config.dbUser, 80),
          phpTargetVersion: body.phpTargetVersion || state.config.phpTargetVersion,
        };
        saveState(state);
        return NextResponse.json({ ok: true, state });
      }

      case 'admin_reset_seed': {
        const reset: DatabaseState = {
          config: { ...INITIAL_SITE_CONFIG },
          catalogue: [...CATALOGUE_SEED],
          inquiries: [...INITIAL_INQUIRIES],
          reviews: [...INITIAL_REVIEWS],
        };
        saveState(reset);
        return NextResponse.json({ ok: true, state: reset });
      }

      default:
        return NextResponse.json({ ok: false }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
