import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { buildZipArchive, ZipEntryInput } from '@/lib/zip-builder';

function collectDirFiles(absDir: string, zipPrefix: string, out: ZipEntryInput[]) {
  if (!fs.existsSync(absDir)) return;
  const items = fs.readdirSync(absDir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(absDir, item.name);
    const relZipPath = zipPrefix ? `${zipPrefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      collectDirFiles(fullPath, relZipPath, out);
    } else if (item.isFile()) {
      out.push({
        name: relZipPath,
        data: fs.readFileSync(fullPath),
      });
    }
  }
}

export async function GET() {
  try {
    const cwd = process.cwd();
    const serverPhpDir = path.join(cwd, 'server-php');
    const publicDir = path.join(cwd, 'public');
    const entries: ZipEntryInput[] = [];

    // 1. Add all PHP 8.3-8.5+ backend files at the root of the deployment package
    const phpFiles = [
      'config.php',
      'index.php',
      'api.php',
      'ad/ad-wz.php',
      '.htaccess',
      'database.sql',
    ];
    for (const rel of phpFiles) {
      const p = path.join(serverPhpDir, rel);
      if (fs.existsSync(p)) {
        entries.push({
          name: rel,
          data: fs.readFileSync(p),
        });
      }
    }

    // 2. Add frontend CSS/JS/robots assets at the root of the deployment package
    const rootPublicFiles = [
      'styles.css',
      'app.js',
      'catalogue.js',
      'feedback.js',
      'site.config.js',
      'robots.txt',
    ];
    for (const rel of rootPublicFiles) {
      const p = path.join(publicDir, rel);
      if (fs.existsSync(p)) {
        entries.push({
          name: rel,
          data: fs.readFileSync(p),
        });
      }
    }

    // 3. Add all 80 showroom photographs & favicon inside assets/
    collectDirFiles(path.join(publicDir, 'assets'), 'assets', entries);

    // 4. Add concise 3-step deployment note
    const readmeText = [
      '========================================================================',
      'SHAHBAZ FURNITURE — READY-TO-UPLOAD PHP 8.3–8.5+ & MYSQL WEBSITE',
      '========================================================================',
      '',
      'ZERO INSTALLATION REQUIRED — 3 SIMPLE STEPS:',
      '',
      '1. Open "config.php" and enter your MySQL database details at the top:',
      '   const SF_DB_HOST    = \'127.0.0.1\';',
      '   const SF_DB_PORT    = 3306;',
      '   const SF_DB_NAME    = \'your_database_name\';',
      '   const SF_DB_USER    = \'your_database_user\';',
      '   const SF_DB_PASS    = \'your_database_password\';',
      '   const SF_ADMIN_USER = \'admin\';',
      '   const SF_ADMIN_PASS = \'Shahbaz@2026!\';',
      '',
      '2. Upload all files in this ZIP directly to your web hosting root',
      '   (for example: public_html/ or htdocs/).',
      '',
      '3. Open your website in the browser!',
      '   - All MySQL tables, all 34 furniture designs, customer reviews, and',
      '     your admin account are created and seeded AUTOMATICALLY on first load.',
      '   - Private Admin Panel URL: /ad/ad-wz',
      '========================================================================',
      '',
    ].join('\n');

    entries.push({
      name: 'README-UPLOAD.txt',
      data: Buffer.from(readmeText, 'utf8'),
    });

    const zipBuffer = buildZipArchive(entries);

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="shahbaz-furniture-ready-to-upload-php.zip"',
        'Content-Length': String(zipBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Archive generation failed.' }, { status: 500 });
  }
}
