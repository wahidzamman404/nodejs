import { NextRequest, NextResponse } from 'next/server';

const BOT_UA_REGEX =
  /(bot|crawler|spider|slurp|curl|wget|python-requests|httpclient|scrapy|go-http-client|phantomjs|nmap|nikto|sqlmap|dirbuster|gobuster|nuclei|zgrab|masscan|ahrefs|semrush|mj12bot|dotbot|petalbot|bytespider|gptbot|ccbot)/i;

const SUSPICIOUS_QUERY_REGEX =
  /(?:<script|javascript:|onerror=|onload=|union\s+select|information_schema|sleep\(\d+\)|benchmark\(|\.\.\/|\.\.\\|%00|\/etc\/passwd)/i;

// In-memory rate limit tracker per IP for /ad/ad-wz and /api/store
const ipRequestMap = new Map<string, { count: number; windowStart: number }>();

function checkIpRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = ipRequestMap.get(ip);
  if (!entry || now - entry.windowStart > windowMs) {
    ipRequestMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= maxRequests;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const ua = req.headers.get('user-agent') || '';
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  // Block SQLi / XSS / Path Traversal payloads in URL across the entire site
  if (SUSPICIOUS_QUERY_REGEX.test(pathname + search)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Never expose /php-backend/* directly as static files
  if (pathname.startsWith('/php-backend')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Strict protection for hidden admin route /ad/ad-wz
  if (pathname.startsWith('/ad')) {
    // Only /ad/ad-wz is valid; any other /ad/* path returns 404
    if (pathname !== '/ad/ad-wz') {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Block automated crawlers, scanners, and empty User-Agents
    if (!ua || BOT_UA_REGEX.test(ua)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Rate limit requests to /ad/ad-wz (max 30 requests per minute per IP)
    if (!checkIpRateLimit(`ad:${ip}`, 30, 60_000)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }

    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'no-referrer');
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    return res;
  }

  const res = NextResponse.next();
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/).*)'],
};
