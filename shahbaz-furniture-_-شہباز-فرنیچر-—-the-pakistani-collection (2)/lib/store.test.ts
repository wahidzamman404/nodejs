import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  toUrduDigits,
  toLatinDigits,
  validateInquiryInput,
  validateReviewInput,
  filterCatalogueDesigns,
  generateDynamicConfigPhp,
  INITIAL_SITE_CONFIG,
  PHP_SECURITY_AUDITS,
} from './store';
import { CATALOGUE_SEED } from './catalogue-data';
import { buildZipArchive } from './zip-builder';

test('Urdu and Latin digit conversions are bidirectional and accurate', () => {
  assert.equal(toUrduDigits(34), '۳۴');
  assert.equal(toUrduDigits('180 cm'), '۱۸۰ cm');
  assert.equal(toLatinDigits('۰۳۱۳ ۴۶۸۳۷۸۶'), '0313 4683786');
  assert.equal(toLatinDigits('٠٣٠٠١٢٣٤٥٦٧'), '03001234567');
});

test('Catalogue contains all 34 bilingual designs from the repository', () => {
  assert.equal(CATALOGUE_SEED.length, 34);
  const classicBed = CATALOGUE_SEED.find((d) => d.id === 'classic-carved-bed');
  assert.ok(classicBed);
  assert.equal(classicBed.category, 'bedroom');
  assert.equal(classicBed.title.en, 'Classic Carved Wood Bed');
});

test('Catalogue filtering supports English, Urdu, category filter, and A-Z sorting', () => {
  const bedrooms = filterCatalogueDesigns(CATALOGUE_SEED, 'bedroom', '', 'featured');
  assert.ok(bedrooms.length > 0);
  assert.ok(bedrooms.every((d) => d.category === 'bedroom'));

  const wardrobeSearch = filterCatalogueDesigns(CATALOGUE_SEED, 'all', 'الماری', 'featured');
  assert.ok(wardrobeSearch.length >= 3);

  const sortedAz = filterCatalogueDesigns(CATALOGUE_SEED, 'doors', '', 'az');
  assert.ok(sortedAz.length >= 2);
  assert.ok(sortedAz[0].title.en.localeCompare(sortedAz[1].title.en) <= 0);
});

test('Inquiry validation enforces required fields, phone digit bounds, and message length', () => {
  const emptyCheck = validateInquiryInput({
    name: '',
    phone: '',
    project: '',
    message: 'short',
  });
  assert.equal(emptyCheck.valid, false);
  assert.ok(emptyCheck.errors.name);
  assert.ok(emptyCheck.errors.phone);
  assert.ok(emptyCheck.errors.project);
  assert.ok(emptyCheck.errors.message);

  const validUrduPhoneCheck = validateInquiryInput({
    name: 'احمد علی',
    phone: '۰۳۱۳ ۴۶۸۳۷۸۶',
    project: 'bedroom',
    message: 'ہمیں چنیوٹی شیشم کا مکمل بیڈروم سیٹ درکار ہے۔',
  });
  assert.equal(validUrduPhoneCheck.valid, true);
  assert.equal(Object.keys(validUrduPhoneCheck.errors).length, 0);
});

test('Review validation enforces rating bounds and 20-character minimum', () => {
  const badReview = validateReviewInput({
    name: 'Ali',
    rating: 6,
    review: 'Too short',
  });
  assert.equal(badReview.valid, false);
  assert.ok(badReview.errors.rating);
  assert.ok(badReview.errors.review);

  const goodReview = validateReviewInput({
    name: 'Usman Khan',
    rating: 5,
    review: 'Excellent woodwork quality and very helpful consultation on Sheesham finish.',
  });
  assert.equal(goodReview.valid, true);
});

test('Dynamic PHP 8.3-8.5 config.php generator sanitizes inputs and outputs strict_types', () => {
  const phpCode = generateDynamicConfigPhp({
    ...INITIAL_SITE_CONFIG,
    phpTargetVersion: '8.5',
    dbName: 'shahbaz_prod_db',
  });
  assert.ok(phpCode.includes('declare(strict_types=1);'));
  assert.ok(phpCode.includes('#[SensitiveParameter]'));
  assert.ok(phpCode.includes('final readonly class AppConfig'));
  assert.ok(phpCode.includes("public string $dbName = 'shahbaz_prod_db'"));
  assert.ok(PHP_SECURITY_AUDITS.every((item) => item.status === 'passed'));
});

test('Ready-to-upload PHP package files include autoBootstrapSchema, full HTML body, and valid ZIP builder', () => {
  const configPhp = fs.readFileSync(path.join(process.cwd(), 'server-php/config.php'), 'utf8');
  const indexPhp = fs.readFileSync(path.join(process.cwd(), 'server-php/index.php'), 'utf8');
  const adminPhp = fs.readFileSync(path.join(process.cwd(), 'server-php/ad/ad-wz.php'), 'utf8');

  assert.ok(configPhp.includes('autoBootstrapSchema'));
  assert.ok(configPhp.includes('CREATE TABLE IF NOT EXISTS `sf_products`'));
  assert.ok(indexPhp.includes('<dialog id="quote-dialog"'));
  assert.ok(indexPhp.includes('<section id="collection"'));
  assert.ok(adminPhp.includes('Admin Login'));

  const zipBuf = buildZipArchive([
    { name: 'config.php', data: Buffer.from(configPhp, 'utf8') },
    { name: 'index.php', data: Buffer.from(indexPhp, 'utf8') },
  ]);
  assert.equal(zipBuf.readUInt32LE(0), 0x04034b50);
  assert.equal(zipBuf.readUInt32LE(zipBuf.length - 22), 0x06054b50);
});

