'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProductDesign, CATALOGUE_SEED } from '@/lib/catalogue-data';
import {
  CustomerReview,
  INITIAL_REVIEWS,
  INITIAL_SITE_CONFIG,
  SiteConfig,
  StudioBrief,
  filterCatalogueDesigns,
  toLatinDigits,
  toUrduDigits,
  validateInquiryInput,
  validateReviewInput,
} from '@/lib/store';

const CATEGORIES: Record<string, { en: string; ur: string }> = {
  living: { en: 'Living & baithak', ur: 'بیٹھک' },
  dining: { en: 'Dining', ur: 'ڈائننگ' },
  bedroom: { en: 'Bedroom', ur: 'بیڈروم' },
  storage: { en: 'Storage & wardrobes', ur: 'الماریاں اور شیلف' },
  doors: { en: 'Doors', ur: 'دروازے' },
  kitchen: { en: 'Kitchens', ur: 'کچن' },
  office: { en: 'Office', ur: 'دفتر' },
  custom: { en: 'A custom project', ur: 'حسبِ فرمائش کام' },
};

const WOODS: Record<string, { en: string; ur: string }> = {
  sheesham: { en: 'Sheesham', ur: 'شیشم' },
  deodar: { en: 'Deodar', ur: 'دیودار' },
  ash: { en: 'Ash', ur: 'ایش' },
};

const FINISHES: Record<string, { en: string; ur: string }> = {
  natural: { en: 'Natural finish', ur: 'قدرتی رنگ' },
  walnut: { en: 'Walnut tone', ur: 'اخروٹی پالش' },
  dark: { en: 'Dark finish', ur: 'گہری پالش' },
};

const TEAM_PROFILES = [
  {
    id: 'designer',
    symbol: 'i-ruler',
    title: { en: 'Furniture design adviser', ur: 'فرنیچر ڈیزائن مشیر' },
    role: { en: 'Your room. Your family. Your style.', ur: 'آپ کا کمرہ، آپ کی پسند' },
    description: {
      en: 'Choose a bedroom, sofa, door, wardrobe or kitchen reference and plan the proportions for your room.',
      ur: 'بیڈروم، صوفے، دروازے، الماری یا کچن کی تصویر منتخب کریں اور اپنی جگہ کے مطابق سائز پر بات کریں۔',
    },
    action: { en: 'Discuss your design', ur: 'اپنے ڈیزائن پر بات کریں' },
    inquiry:
      'I would like to speak with your furniture design adviser about my room and preferred furniture style. My idea is:\nمیں اپنے کمرے اور پسندیدہ فرنیچر کے بارے میں آپ کے ڈیزائن مشیر سے بات کرنا چاہتا/چاہتی ہوں۔ میرا خیال یہ ہے:',
  },
  {
    id: 'maker',
    symbol: 'i-wood',
    title: { en: 'Workshop specialist', ur: 'لکڑی اور کاریگری کے ماہر' },
    role: { en: 'Materials. Carving. The right finish.', ur: 'لکڑی، نقش و نگار اور پسند کی پالش' },
    description: {
      en: 'Discuss suitable materials, carved details, cabinet construction, upholstery and the finish for your furniture.',
      ur: 'موزوں لکڑی، نقش و نگار، کیبنٹ کی بناوٹ، کپڑے اور مناسب پالش کی تفصیلات سمجھیں۔',
    },
    action: { en: 'Ask about the woodwork', ur: 'کاریگری کے بارے میں پوچھیں' },
    inquiry:
      'I would like to discuss timber, carving, construction, and polish with your workshop specialist. My question is:\nمیں لکڑی، نقش و نگار، بناوٹ اور پالش کے بارے میں آپ کے ماہر کاریگر سے بات کرنا چاہتا/چاہتی ہوں۔ میرا سوال یہ ہے:',
  },
  {
    id: 'coordinator',
    symbol: 'i-grid',
    title: { en: 'Project coordinator', ur: 'آپ کے کام کی رہنمائی' },
    role: { en: 'From one piece to a complete home.', ur: 'ایک خاص چیز سے پورے گھر تک' },
    description: {
      en: 'Organize sizes, quantities, a budget in PKR, and your delivery or fitting requirements before a furniture order.',
      ur: 'آرڈر سے پہلے سائز، تعداد، پاکستانی روپے میں بجٹ، ترسیل اور فٹنگ کی ضروریات پر واضح بات کریں۔',
    },
    action: { en: 'Plan your project', ur: 'اپنے کام کی منصوبہ بندی کریں' },
    inquiry:
      'I would like help planning the sizes, quantities, budget, and delivery requirements for my furniture project. My requirements are:\nمیں اپنے فرنیچر کے کام کے سائز، تعداد، بجٹ اور ترسیل کی منصوبہ بندی کے لیے رہنمائی چاہتا/چاہتی ہوں۔ میری ضروریات یہ ہیں:',
  },
];

function Bi({ en, ur }: { en: string; ur: string }) {
  return (
    <>
      <span className="bi-en" lang="en" dir="ltr">
        {en}
      </span>
      <span className="bi-ur" lang="ur" dir="rtl">
        {ur}
      </span>
    </>
  );
}

const photoThumb = (src: string) =>
  `/${src.replace(/^\/+/, '').replace('assets/real/photo-', 'assets/real/thumbs/photo-')}`;
const fullPhotoUrl = (src: string) => `/${src.replace(/^\/+/, '')}`;

export default function ShowroomApp() {
  const [config, setConfig] = useState<SiteConfig>(INITIAL_SITE_CONFIG);
  const [catalogue, setCatalogue] = useState<ProductDesign[]>(CATALOGUE_SEED);
  const [reviews, setReviews] = useState<CustomerReview[]>(INITIAL_REVIEWS);

  // Showroom interactive states
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'az'>('featured');
  const [visibleLimit, setVisibleLimit] = useState<number>(12);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  // Studio brief state
  const [studioProject, setStudioProject] = useState<string>('living');
  const [studioWood, setStudioWood] = useState<'sheesham' | 'deodar' | 'ash'>('sheesham');
  const [studioFinish, setStudioFinish] = useState<'natural' | 'walnut' | 'dark'>('natural');
  const [studioWidth, setStudioWidth] = useState<number>(180);

  // Lookbook gallery state
  const [galleryIndex, setGalleryIndex] = useState<number>(0);

  // Reviews carousel index
  const [reviewIndex, setReviewIndex] = useState<number>(0);

  // Modal dialogs state
  const [activeModal, setActiveModal] = useState<'detail' | 'saved' | 'quote' | 'review' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDesign | null>(null);
  const [detailPhotoIndex, setDetailPhotoIndex] = useState<number>(0);

  // Quote inquiry form state
  const [quoteName, setQuoteName] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteCity, setQuoteCity] = useState('');
  const [quoteProject, setQuoteProject] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteDesignIds, setQuoteDesignIds] = useState<string[]>([]);
  const [quoteStudio, setQuoteStudio] = useState<StudioBrief | null>(null);
  const [quoteErrors, setQuoteErrors] = useState<Record<string, string>>({});
  const [preparedQuoteText, setPreparedQuoteText] = useState<string>('');
  const [quoteStatusMsg, setQuoteStatusMsg] = useState<{ en: string; ur: string } | null>(null);

  // Review form state
  const [revName, setRevName] = useState('');
  const [revCity, setRevCity] = useState('');
  const [revRating, setRevRating] = useState<number>(5);
  const [revText, setRevText] = useState('');
  const [revError, setRevError] = useState<string>('');
  const [hasSubmittedReview, setHasSubmittedReview] = useState<boolean>(false);

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<{ en: string; ur: string } | null>(null);

  const showToast = (en: string, ur: string) => {
    setToastMsg({ en, ur });
  };

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Load initial persistent state & check URL params
  useEffect(() => {
    document.documentElement.classList.add('js-ready');
    try {
      const raw = window.localStorage.getItem('sf-test4-shortlist');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedIds(parsed.filter((x) => typeof x === 'string'));
      }
    } catch {
      // Ignore storage error
    }

    fetch('/api/store')
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) {
          if (data.config) {
            setConfig((prev) => ({ ...prev, ...data.config }));
          }
          if (Array.isArray(data.catalogue)) {
            setCatalogue(data.catalogue);
          }
          if (Array.isArray(data.reviews)) {
            setReviews(data.reviews);
          }
        }
      })
      .catch(() => {
        // Silent fallback to local defaults
      });

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleServerMutate = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      }
    } catch {
      // Silent fallback
    }
  };

  const productMap = useMemo(() => {
    return new Map(catalogue.map((p) => [p.id, p]));
  }, [catalogue]);

  const visibleProducts = useMemo(() => {
    return filterCatalogueDesigns(catalogue, activeCategory, searchQuery, sortBy);
  }, [catalogue, activeCategory, searchQuery, sortBy]);

  const galleryProducts = useMemo(() => {
    const list = config.galleryProductIds
      .map((id) => productMap.get(id))
      .filter((p): p is ProductDesign => Boolean(p));
    return list.length > 0 ? list : catalogue.slice(0, 6);
  }, [config.galleryProductIds, productMap, catalogue]);

  const approvedReviews = useMemo(() => {
    return reviews.filter((r) => r.status === 'approved');
  }, [reviews]);

  const toggleSaved = (id: string) => {
    if (!productMap.has(id)) return;
    const isAlreadySaved = savedIds.includes(id);
    const next = isAlreadySaved ? savedIds.filter((item) => item !== id) : [...savedIds, id];
    setSavedIds(next);
    try {
      window.localStorage.setItem('sf-test4-shortlist', JSON.stringify(next));
    } catch {
      // Ignore
    }
    if (isAlreadySaved) {
      showToast('Design removed from your shortlist.', 'ڈیزائن پسندیدہ فہرست سے ہٹا دیا گیا۔');
    } else {
      showToast('Design saved to your shortlist.', 'ڈیزائن پسندیدہ فہرست میں محفوظ ہو گیا۔');
    }
  };

  const clearSaved = () => {
    setSavedIds([]);
    try {
      window.localStorage.setItem('sf-test4-shortlist', '[]');
    } catch {
      // Ignore
    }
    showToast('Your shortlist is clear.', 'پسندیدہ فہرست خالی کر دی گئی۔');
  };

  const openProductDetail = (id: string) => {
    const prod = productMap.get(id);
    if (!prod) return;
    setSelectedProduct(prod);
    setDetailPhotoIndex(0);
    setActiveModal('detail');
  };

  const openQuoteModal = (opts?: {
    project?: string;
    productId?: string;
    studio?: StudioBrief;
    messagePrompt?: string;
  }) => {
    const mergedDesigns = Array.from(
      new Set([...savedIds, ...(opts?.productId ? [opts.productId] : [])])
    ).filter((id) => productMap.has(id));
    setQuoteDesignIds(mergedDesigns);
    setQuoteStudio(opts?.studio || null);

    const prod = opts?.productId ? productMap.get(opts.productId) : undefined;
    const nextProj = opts?.project || prod?.category || opts?.studio?.project || '';
    if (nextProj && CATEGORIES[nextProj]) {
      setQuoteProject(nextProj);
    }

    if (opts?.messagePrompt) {
      setQuoteMessage((prev) =>
        prev.includes(opts.messagePrompt!)
          ? prev
          : prev.trim()
          ? `${prev.trim()}\n\n${opts.messagePrompt}`
          : opts.messagePrompt!
      );
    }

    setPreparedQuoteText('');
    setQuoteErrors({});
    setQuoteStatusMsg(null);
    setMobileMenuOpen(false);
    setActiveModal('quote');
  };

  const buildInquirySummaryText = () => {
    const catInfo = CATEGORIES[quoteProject] || { en: quoteProject, ur: quoteProject };
    const lines = [
      `${config.brand} / ${config.brandUrdu}`,
      'PROJECT INQUIRY / کام کی تفصیل',
      '',
      `Name / نام: ${quoteName.trim()}`,
      `Phone / فون: \u2066${toLatinDigits(quotePhone.trim())}\u2069`,
      `City / شہر: ${quoteCity.trim() || 'Not specified / درج نہیں کیا گیا'}`,
      `Project / کام کی نوعیت: ${catInfo.en} / ${catInfo.ur}`,
    ];

    if (quoteDesignIds.length > 0) {
      lines.push('', 'Selected designs / منتخب ڈیزائن:');
      quoteDesignIds.forEach((id) => {
        const p = productMap.get(id);
        if (p) lines.push(`${p.title.en} / ${p.title.ur}`);
      });
    }

    if (quoteStudio) {
      const sCat = CATEGORIES[quoteStudio.project] || CATEGORIES.custom;
      const sWood = WOODS[quoteStudio.wood] || WOODS.sheesham;
      const sFin = FINISHES[quoteStudio.finish] || FINISHES.natural;
      lines.push(
        '',
        'Your design direction / آپ کی پسند کی تفصیل:',
        `${sCat.en} · ${sWood.en} · ${sFin.en} · ${quoteStudio.width} cm wide`,
        `${sCat.ur} · ${sWood.ur} · ${sFin.ur} · ${toUrduDigits(quoteStudio.width)} سینٹی میٹر چوڑائی`
      );
    }

    lines.push(
      '',
      'Project details / آپ کے کام کی تفصیل:',
      quoteMessage.trim(),
      '',
      'Please discuss final measurements, materials, finish, price, production time and delivery with me before confirming an order.',
      'آرڈر کی تصدیق سے پہلے حتمی پیمائش، لکڑی، پالش، قیمت، تیاری کا وقت اور ترسیل کی تفصیلات باہمی مشاورت سے طے کریں۔'
    );

    return lines.join('\n');
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = toLatinDigits(quotePhone);
    setQuotePhone(normalizedPhone);

    const validation = validateInquiryInput({
      name: quoteName,
      phone: normalizedPhone,
      project: quoteProject,
      message: quoteMessage,
    });

    if (!validation.valid) {
      setQuoteErrors(validation.errors);
      setQuoteStatusMsg({
        en: 'Please check the highlighted fields before continuing.',
        ur: 'آگے بڑھنے سے پہلے نشان زدہ خانوں کی معلومات درست کریں۔',
      });
      return;
    }

    setQuoteErrors({});
    const summary = buildInquirySummaryText();
    setPreparedQuoteText(summary);
    setQuoteStatusMsg({
      en: 'Your inquiry is ready. Review it below, then choose WhatsApp to share.',
      ur: 'آپ کے کام کی تفصیل تیار ہے۔ اسے دیکھ کر واٹس ایپ پر شیئر کرنے کا انتخاب کریں۔',
    });

    await handleServerMutate({
      action: 'submit_inquiry',
      name: quoteName.trim(),
      phone: normalizedPhone.trim(),
      city: quoteCity.trim(),
      project: quoteProject,
      designIds: quoteDesignIds,
      studio: quoteStudio,
      message: quoteMessage.trim(),
    });
  };

  const handleCopyPreparedQuote = async () => {
    if (!preparedQuoteText) return;
    try {
      await navigator.clipboard.writeText(preparedQuoteText);
      setQuoteStatusMsg({
        en: 'Project inquiry copied. Paste it into your preferred messaging app.',
        ur: 'کام کی تفصیل کاپی ہو گئی۔ اسے اپنی پسند کی پیغام رسانی کی ایپ میں پیسٹ کریں۔',
      });
    } catch {
      setQuoteStatusMsg({
        en: 'Select the inquiry text above to copy it manually.',
        ur: 'اوپر دیا گیا متن منتخب کر کے خود کاپی کر لیں۔',
      });
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateReviewInput({
      name: revName,
      rating: revRating,
      review: revText,
    });
    if (!validation.valid) {
      const firstErr = Object.values(validation.errors)[0] || 'Please check your review details.';
      setRevError(firstErr);
      return;
    }
    setRevError('');
    await handleServerMutate({
      action: 'submit_review',
      name: revName.trim(),
      city: revCity.trim(),
      rating: revRating,
      review: revText.trim(),
    });
    setHasSubmittedReview(true);
    setRevName('');
    setRevCity('');
    setRevRating(5);
    setRevText('');
    setReviewIndex(0);
    setActiveModal(null);
    showToast('Review added and saved.', 'آپ کی رائے شامل کر لی گئی ہے۔');
  };

  const currentGalleryItem =
    galleryProducts[galleryIndex % Math.max(1, galleryProducts.length)] || catalogue[0];
  const detailImages =
    selectedProduct?.images && selectedProduct.images.length > 0
      ? selectedProduct.images
      : selectedProduct
      ? [selectedProduct.defaultImage]
      : [];
  const whatsappClean = config.whatsappNumber.replace(/\D/g, '') || '923134683786';
  const defaultWaLink = `https://wa.me/${whatsappClean}?text=${encodeURIComponent(
    `Assalam-o-Alaikum! I would like to discuss a furniture or custom woodwork project with ${config.brand}.\nالسلام علیکم! مجھے ${config.brandUrdu} سے فرنیچر اور لکڑی کے حسبِ فرمائش کام کے بارے میں معلومات درکار ہیں۔`
  )}`;

  return (
    <>
      {/* SVG Sprite from Original Repository */}
      <svg className="icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <symbol id="i-arrow" viewBox="0 0 24 24">
            <path d="M5 19 19 5M5 5h14v14" />
          </symbol>
          <symbol id="i-next" viewBox="0 0 24 24">
            <path d="M4 12h16M14 6l6 6-6 6" />
          </symbol>
          <symbol id="i-prev" viewBox="0 0 24 24">
            <path d="M20 12H4m6-6-6 6 6 6" />
          </symbol>
          <symbol id="i-heart" viewBox="0 0 24 24">
            <path d="M20.5 4.5a5 5 0 0 0-7 0L12 6l-1.5-1.5a5 5 0 0 0-7 7L12 20l8.5-8.5a5 5 0 0 0 0-7Z" />
          </symbol>
          <symbol id="i-search" viewBox="0 0 24 24">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
          </symbol>
          <symbol id="i-wa" viewBox="0 0 24 24">
            <path d="M20.5 11.6a8.6 8.6 0 0 1-12.7 7.5L3 20.5l1.3-4.6a8.6 8.6 0 1 1 16.2-4.3Z" />
            <path d="M8.3 7.3c-.4.5-.5 1.3-.2 2.1.8 2.1 2.4 3.8 4.6 4.8.8.4 1.6.4 2.2 0l.8-1.1-2-1-1 1c-1.6-.7-2.6-1.8-3.1-3.2l.8-.8-.9-2-.7.2Z" />
          </symbol>
          <symbol id="i-grid" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </symbol>
          <symbol id="i-wood" viewBox="0 0 24 24">
            <path d="M4 3h16v18H4V3Zm4 0v6c0 3 5 3 5 7v5M15 3v4c0 4-4 4-4 7v7M17 12c3 3 0 5 0 9" />
          </symbol>
          <symbol id="i-ruler" viewBox="0 0 24 24">
            <path d="m3 17 14-14 4 4L7 21l-4-4Zm4-4 2 2m2-6 2 2m2-6 2 2" />
          </symbol>
          <symbol id="i-star" viewBox="0 0 24 24">
            <path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.6l-5.7 2.9 1.1-6.3-4.6-4.5 6.4-.9L12 3Z" />
          </symbol>
          <symbol id="i-flower" viewBox="0 0 32 32">
            <path d="m16 2 4 6 7-1-1 7 6 2-6 4 1 7-7-1-4 6-2-6-7 1 1-7-6-4 6-2-1-7 7 1 2-6Z" />
            <circle cx="16" cy="16" r="4" />
          </symbol>
        </defs>
      </svg>

      <a className="skip-link" href="#main">
        Skip to content · اصل مواد
      </a>

      {/* Topline */}
      <div className="topline">
        <div className="container">
          <span>PAKISTANI CRAFT. PERSONAL BY DESIGN.</span>
          <span className="ur" lang="ur" dir="rtl">
            پاکستانی ہنر، آپ کی پسند
          </span>
          <a href={`tel:${config.phoneDisplay.replace(/\s+/g, '')}`}>{config.phoneDisplay}</a>
        </div>
      </div>

      {/* Site Header */}
      <header id="site-header" className={`site-header${isScrolled ? ' is-scrolled' : ''}`}>
        <div className="header-inner container">
          <a className="brand" href="#home" aria-label={`${config.brand} home`}>
            <span className="brand-mark">
              SF<span>PK</span>
            </span>
            <span className="brand-name">
              {config.brand.split(' ')[0] || 'Shahbaz'}
              <span>{config.brand.split(' ').slice(1).join(' ').toUpperCase() || 'FURNITURE'}</span>
            </span>
            <span className="brand-urdu ur" lang="ur" dir="rtl">
              {config.brandUrdu}
            </span>
          </a>

          <nav id="site-nav" className={mobileMenuOpen ? 'is-open' : ''} aria-label="Main navigation">
            <a href="#collection" onClick={() => setMobileMenuOpen(false)}>
              Collection
              <span className="ur" lang="ur" dir="rtl">
                ہمارے ڈیزائن
              </span>
            </a>
            <a href="#craft" onClick={() => setMobileMenuOpen(false)}>
              Our craft
              <span className="ur" lang="ur" dir="rtl">
                ہمارا ہنر
              </span>
            </a>
            <a href="#studio" onClick={() => setMobileMenuOpen(false)}>
              Custom made
              <span className="ur" lang="ur" dir="rtl">
                آپ کی پسند
              </span>
            </a>
            <a href="#gallery" onClick={() => setMobileMenuOpen(false)}>
              Lookbook
              <span className="ur" lang="ur" dir="rtl">
                ڈیزائن گیلری
              </span>
            </a>
            <a href="#reviews" onClick={() => setMobileMenuOpen(false)}>
              Reviews
              <span className="ur" lang="ur" dir="rtl">
                آپ کی رائے
              </span>
            </a>
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="saved-open icon-button"
              aria-label="Saved designs · پسندیدہ ڈیزائن"
              onClick={() => setActiveModal('saved')}
            >
              <svg aria-hidden="true">
                <use href="#i-heart" />
              </svg>
              <span data-saved-count>{savedIds.length}</span>
            </button>
            <button
              type="button"
              className="button nav-inquiry"
              onClick={() => openQuoteModal()}
            >
              Let’s talk{' '}
              <svg aria-hidden="true">
                <use href="#i-arrow" />
              </svg>
            </button>
            <button
              id="menu-toggle"
              type="button"
              className="menu-toggle"
              aria-label={
                mobileMenuOpen
                  ? 'Close navigation / مینو بند کریں'
                  : 'Open menu · مینو کھولیں'
              }
              aria-controls="site-nav"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((o) => !o)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main">
        {/* Hero Section */}
        <section id="home" className="hero" aria-labelledby="hero-title">
          <img
            className="hero-background"
            src="/assets/real/photo-21.jpg"
            alt="Mustard and cream corner sofa with a black and gold centre table"
            width="1536"
            height="1024"
            referrerPolicy="no-referrer"
          />
          <div className="hero-shade" />
          <div className="hero-inner container">
            <div className="hero-copy">
              <p className="eyebrow">
                <span />
                THE PAKISTANI COLLECTION
              </p>
              <p className="hero-urdu ur" lang="ur" dir="rtl">
                گھر اپنا، انداز اپنا۔
              </p>
              <h1 id="hero-title">
                A home.
                <br />
                Your style.
                <br />
                <em>A little Shahbaz.</em>
              </h1>
              <p className="hero-description">
                Statement beds. Comfortable sofas. Doors, wardrobes and kitchens. Choose a photo you
                love, then make the details your own.
              </p>
              <p className="hero-description-ur ur" lang="ur" dir="rtl">
                بیڈ، صوفے، دروازے، الماریاں اور کچن۔ اپنی پسند کی تصویر منتخب کریں، تفصیلات ساتھ طے
                کریں۔
              </p>
              <div className="hero-actions">
                <a className="button button-gold" href="#collection">
                  Explore the collection{' '}
                  <svg aria-hidden="true">
                    <use href="#i-arrow" />
                  </svg>
                </a>
                <a className="hero-secondary" href="#studio">
                  Made around you{' '}
                  <span className="ur" lang="ur" dir="rtl">
                    جیسا آپ چاہیں
                  </span>
                </a>
              </div>
            </div>
            <div className="hero-bottom">
              <span>BEDS / SOFAS / DOORS / KITCHENS</span>
              <a href="#collection" className="hero-discover">
                SCROLL TO DISCOVER <span>↓</span>
              </a>
              <div className="hero-edition">
                <span className="edition-number">01</span>
                <span>
                  THE PHOTO COLLECTION
                  <small className="ur" lang="ur" dir="rtl">
                    اپنے گھر کے لیے اپنی پسند
                  </small>
                </span>
              </div>
            </div>
          </div>
          <span className="hero-concept">THE DESIGN PHOTO COLLECTION · منتخب تصویری ڈیزائن</span>
        </section>

        {/* Signature Strip */}
        <div className="signature-strip">
          <div className="container">
            <span>
              <svg aria-hidden="true">
                <use href="#i-flower" />
              </svg>
              ROOTED IN PAKISTAN
            </span>
            <span className="ur" lang="ur" dir="rtl">
              روایت بھی، آپ کی پسند بھی
            </span>
            <span>ONE PIECE. OR YOUR WHOLE HOME.</span>
          </div>
        </div>

        {/* Room Edits */}
        <section className="room-edits section container" aria-labelledby="edits-title">
          <div className="section-top">
            <p className="eyebrow dark">
              <span />
              SPACES WE CALL HOME
            </p>
            <span className="ur section-urdu" lang="ur" dir="rtl">
              اپنے گھر کی بات ہی اور ہے
            </span>
          </div>
          <h2 id="edits-title" className="sr-only">
            Find your room · اپنے کمرے کے لیے منتخب کریں
          </h2>
          <div className="room-grid">
            <a
              className="room-card room-wide"
              href="#collection"
              onClick={() => {
                setActiveCategory('bedroom');
                setVisibleLimit(12);
                setSearchQuery('');
              }}
            >
              <img
                src="/assets/real/photo-14.jpg"
                alt="Supplied photograph of a carved wooden bed and matching bedside units"
                loading="lazy"
                width="1200"
                height="900"
                referrerPolicy="no-referrer"
              />
              <div className="room-card-copy">
                <span className="room-number">01 / BEDROOM</span>
                <h3>
                  A room of <em>your own.</em>
                </h3>
                <span className="ur" lang="ur" dir="rtl">
                  بیڈروم کا اپنا انداز
                </span>
              </div>
              <span className="room-arrow">
                <svg className="inline-arrow" aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </span>
            </a>

            <a
              className="room-card"
              href="#collection"
              onClick={() => {
                setActiveCategory('doors');
                setVisibleLimit(12);
                setSearchQuery('');
              }}
            >
              <img
                src="/assets/real/photo-15.jpg"
                alt="Supplied photograph of a wooden double entrance door"
                loading="lazy"
                width="1200"
                height="900"
                referrerPolicy="no-referrer"
              />
              <div className="room-card-copy">
                <span className="room-number">02 / DOORS</span>
                <h3>Make an entrance.</h3>
                <span className="ur" lang="ur" dir="rtl">
                  گھر کی خوبصورت دہلیز
                </span>
              </div>
              <span className="room-arrow">
                <svg className="inline-arrow" aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </span>
            </a>

            <a
              className="room-card"
              href="#collection"
              onClick={() => {
                setActiveCategory('kitchen');
                setVisibleLimit(12);
                setSearchQuery('');
              }}
            >
              <img
                src="/assets/real/photo-41.jpg"
                alt="Supplied photograph of fitted kitchen cabinetry"
                loading="lazy"
                width="1200"
                height="900"
                referrerPolicy="no-referrer"
              />
              <div className="room-card-copy">
                <span className="room-number">03 / KITCHENS</span>
                <h3>A place for everything.</h3>
                <span className="ur" lang="ur" dir="rtl">
                  ہر چیز کے لیے مناسب جگہ
                </span>
              </div>
              <span className="room-arrow">
                <svg className="inline-arrow" aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </span>
            </a>
          </div>
        </section>

        {/* Catalogue Collection Section */}
        <section id="collection" className="collection section" aria-labelledby="collection-title">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow dark">
                  <span />
                  THE SHAHBAZ SELECTION
                </p>
                <h2 id="collection-title">
                  Beautifully Pakistani.
                  <br />
                  <em>Personally yours.</em>
                </h2>
              </div>
              <div className="heading-aside">
                <h3 className="ur" lang="ur" dir="rtl">
                  پاکستانی ڈیزائن، آپ کی اپنی پسند۔
                </h3>
                <p>Discover the details. Save what you love. Let’s shape the rest around your home.</p>
                <p className="ur" lang="ur" dir="rtl">
                  ڈیزائن دیکھیں، پسندیدہ چیزیں محفوظ کریں اور اپنی ضرورت کے مطابق بنوائیں۔
                </p>
              </div>
            </div>

            <div className="catalogue-tools">
              <div className="category-scroll" role="group" aria-label="Furniture categories">
                {[
                  { key: 'all', en: 'All designs', ur: 'تمام ڈیزائن' },
                  { key: 'bedroom', en: 'Bedroom', ur: 'بیڈروم' },
                  { key: 'living', en: 'Baithak', ur: 'بیٹھک' },
                  { key: 'kitchen', en: 'Kitchens', ur: 'کچن' },
                  { key: 'storage', en: 'Storage', ur: 'الماری اور کیبنٹ' },
                  { key: 'doors', en: 'Doors', ur: 'دروازے' },
                  { key: 'custom', en: 'Woodwork', ur: 'لکڑی کا کام' },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    className={activeCategory === cat.key ? 'active' : ''}
                    aria-pressed={activeCategory === cat.key}
                    onClick={() => {
                      setActiveCategory(cat.key);
                      setVisibleLimit(12);
                    }}
                  >
                    {cat.en}
                    <span className="ur" lang="ur" dir="rtl">
                      {cat.ur}
                    </span>
                  </button>
                ))}
              </div>

              <div className="catalogue-search-row">
                <label className="search-box">
                  <svg aria-hidden="true">
                    <use href="#i-search" />
                  </svg>
                  <input
                    id="design-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setVisibleLimit(12);
                    }}
                    placeholder="Find your design / ڈیزائن تلاش کریں"
                    aria-label="Search designs in English or Urdu"
                    autoComplete="off"
                  />
                </label>

                <label className="sort-box">
                  <span className="sr-only">Sort designs / ترتیب</span>
                  <select
                    id="design-sort"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as 'featured' | 'az');
                      setVisibleLimit(12);
                    }}
                  >
                    <option value="featured">Featured / منتخب</option>
                    <option value="az">Name A–Z / نام</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="catalogue-meta">
              <span id="design-count" role="status">
                <Bi
                  en={`${visibleProducts.length} ${
                    visibleProducts.length === 1 ? 'design' : 'designs'
                  }`}
                  ur={`${toUrduDigits(visibleProducts.length)} ڈیزائن`}
                />
              </span>
              <button
                type="button"
                className="saved-open text-button"
                onClick={() => setActiveModal('saved')}
              >
                <svg aria-hidden="true">
                  <use href="#i-heart" />
                </svg>
                My shortlist{' '}
                <span className="ur" lang="ur" dir="rtl">
                  میری پسند
                </span>
                <span data-saved-count>{savedIds.length}</span>
              </button>
            </div>

            {/* Design Cards Grid */}
            <div className="design-grid" id="design-grid">
              {visibleProducts.slice(0, visibleLimit).map((product) => {
                const isSaved = savedIds.includes(product.id);
                const catLabel = CATEGORIES[product.category] || CATEGORIES.custom;
                return (
                  <article key={product.id} className="design-card">
                    <div className="design-photo">
                      <button
                        type="button"
                        className="design-photo-button product-open"
                        onClick={() => openProductDetail(product.id)}
                        aria-label={`View ${product.title.en} / ${product.title.ur} — ڈیزائن دیکھیں`}
                      >
                        <img
                          src={photoThumb(product.defaultImage)}
                          alt={`${product.title.en} / ${product.title.ur} — Edited supplied design photograph`}
                          loading="lazy"
                          decoding="async"
                          width="900"
                          height="1100"
                          referrerPolicy="no-referrer"
                        />
                        <span className="design-photo-action">
                          <Bi en="View design" ur="ڈیزائن دیکھیں" />
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M5 12h14m-6-6 6 6-6 6"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`save-design${isSaved ? ' is-saved' : ''}`}
                        aria-pressed={isSaved}
                        aria-label={`${
                          isSaved ? 'Remove from your shortlist' : 'Save to your shortlist'
                        }: ${product.title.en}`}
                        onClick={() => toggleSaved(product.id)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M20.5 4.5a5 5 0 0 0-7 0L12 6l-1.5-1.5a5 5 0 0 0-7 7L12 20l8.5-8.5a5 5 0 0 0 0-7Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="design-info">
                      <div className="design-meta">
                        <small>
                          <Bi en={catLabel.en} ur={catLabel.ur} />
                        </small>
                        <span>
                          <Bi en="Made to order" ur="آپ کی فرمائش پر" />
                        </span>
                      </div>
                      <h3 className="design-title">
                        <button
                          type="button"
                          className="product-open"
                          onClick={() => openProductDetail(product.id)}
                        >
                          <Bi en={product.title.en} ur={product.title.ur} />
                        </button>
                      </h3>
                      <button
                        type="button"
                        className="design-more product-open"
                        onClick={() => openProductDetail(product.id)}
                      >
                        <Bi en="View design" ur="ڈیزائن دیکھیں" />
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M5 12h14m-6-6 6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {visibleProducts.length > 0 && (
              <div className="catalogue-pagination">
                <p id="catalogue-shown" role="status">
                  <Bi
                    en={`Showing ${Math.min(visibleLimit, visibleProducts.length)} of ${
                      visibleProducts.length
                    } designs`}
                    ur={`${toUrduDigits(visibleProducts.length)} میں سے ${toUrduDigits(
                      Math.min(visibleLimit, visibleProducts.length)
                    )} ڈیزائن`}
                  />
                </p>
                {visibleLimit < visibleProducts.length && (
                  <button
                    id="catalogue-more"
                    type="button"
                    className="button button-dark"
                    onClick={() => setVisibleLimit((l) => l + 12)}
                  >
                    <span>Explore more designs</span>
                    <span className="ur" lang="ur" dir="rtl">
                      مزید ڈیزائن دیکھیں
                    </span>
                    <svg aria-hidden="true">
                      <use href="#i-arrow" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {visibleProducts.length === 0 && (
              <div id="design-empty" className="empty-state">
                <h3>Something different in mind?</h3>
                <p className="ur" lang="ur" dir="rtl">
                  کچھ اور بنوانا چاہتے ہیں؟
                </p>
                <button
                  type="button"
                  className="button button-dark"
                  onClick={() => openQuoteModal()}
                >
                  Tell us your idea · اپنی پسند بتائیں{' '}
                  <svg className="inline-arrow" aria-hidden="true">
                    <use href="#i-arrow" />
                  </svg>
                </button>
              </div>
            )}

            <div className="catalogue-note">
              <svg aria-hidden="true">
                <use href="#i-wood" />
              </svg>
              <p>
                From a favourite design to complete home woodwork.
                <span className="ur" lang="ur" dir="rtl">
                  پسندیدہ ڈیزائن سے پورے گھر کے لکڑی کے کام تک۔
                </span>
              </p>
              <button
                type="button"
                className="text-button"
                onClick={() => openQuoteModal()}
              >
                Have a custom idea?{' '}
                <svg aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Craft Section */}
        <section id="craft" className="craft section" aria-labelledby="craft-title">
          <div className="container craft-grid">
            <div className="craft-visual">
              <img
                src="/assets/real/photo-31.jpg"
                alt="Supplied workshop photograph of a carved wooden dressing table and arched frame"
                loading="lazy"
                width="1536"
                height="1024"
                referrerPolicy="no-referrer"
              />
              <span className="craft-image-label">
                FROM THE SHARED WORKSHOP PHOTOS · ورکشاپ کی تصاویر
              </span>
              <div className="craft-seal">
                <span>RIWAYAT</span>
                <svg aria-hidden="true">
                  <use href="#i-flower" />
                </svg>
                <span className="ur" lang="ur" dir="rtl">
                  پاکستانی ہنر
                </span>
              </div>
            </div>
            <div className="craft-copy">
              <p className="eyebrow">
                <span />
                BEYOND THE ORDINARY
              </p>
              <h2 id="craft-title">
                From the details
                <br />
                to the whole
                <br />
                <em>room.</em>
              </h2>
              <h3 className="ur" lang="ur" dir="rtl">
                ہاتھ کا ہنر، گھر کی پہچان۔
              </h3>
              <p>
                Carved dressing tables, fitted wardrobes, kitchen cabinets and doors. Explore
                furniture details and installation stages in the photo collection, then discuss your
                own measurements and finish.
              </p>
              <p className="ur" lang="ur" dir="rtl">
                نقش دار ڈریسنگ، فٹڈ الماری، کچن اور دروازے۔ تصویری مجموعے میں ڈیزائن اور تنصیب کے
                مراحل دیکھیں، پھر اپنے ناپ اور پسند کی تفصیلات طے کریں۔
              </p>
              <div className="craft-points">
                <div>
                  <span>01</span>
                  <p>
                    Carved details
                    <small className="ur" lang="ur" dir="rtl">
                      لکڑی کے نقش و نگار
                    </small>
                  </p>
                </div>
                <div>
                  <span>02</span>
                  <p>
                    Your choice of wood
                    <small className="ur" lang="ur" dir="rtl">
                      آپ کی پسند کی لکڑی
                    </small>
                  </p>
                </div>
                <div>
                  <span>03</span>
                  <p>
                    Made for your space
                    <small className="ur" lang="ur" dir="rtl">
                      آپ کی جگہ کے مطابق
                    </small>
                  </p>
                </div>
              </div>
              <a className="text-button light-link" href="#studio">
                Create your own brief{' '}
                <svg aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* Bespoke Studio Configurator */}
        <section id="studio" className="studio section" aria-labelledby="studio-title">
          <div className="container studio-grid">
            <div className="studio-intro">
              <p className="eyebrow dark">
                <span />
                THE BESPOKE STUDIO
              </p>
              <h2 id="studio-title">
                Your space.
                <br />
                Your story.
                <br />
                <em>Your furniture.</em>
              </h2>
              <h3 className="ur" lang="ur" dir="rtl">
                جیسا آپ چاہیں، ویسا بنوائیں۔
              </h3>
              <p>
                A bedroom set, a sofa, a fitted kitchen or a new door. Choose a starting point from
                the real photo collection and tell us your preferences.
              </p>
              <p className="ur" lang="ur" dir="rtl">
                بیڈروم سیٹ، صوفہ، فٹڈ کچن یا نیا دروازہ۔ تصویروں سے اپنی پسند منتخب کریں اور اپنی
                ضروریات بتائیں۔
              </p>
              <div className="wood-notes">
                <span>
                  <i className="wood-sample sheesham" />
                  Sheesham{' '}
                  <b className="ur" lang="ur" dir="rtl">
                    شیشم
                  </b>
                </span>
                <span>
                  <i className="wood-sample deodar" />
                  Deodar{' '}
                  <b className="ur" lang="ur" dir="rtl">
                    دیودار
                  </b>
                </span>
                <span>
                  <i className="wood-sample ash" />
                  Ash{' '}
                  <b className="ur" lang="ur" dir="rtl">
                    ایش
                  </b>
                </span>
              </div>
              <p className="fine-print">
                Material suitability and availability are confirmed with your quotation.
                <span className="ur" lang="ur" dir="rtl">
                  لکڑی اور دستیابی کی حتمی تصدیق قیمت طے کرتے وقت ہوگی۔
                </span>
              </p>
            </div>

            <form
              id="studio-form"
              className="studio-form"
              onSubmit={(e) => {
                e.preventDefault();
                openQuoteModal({
                  studio: {
                    project: studioProject,
                    wood: studioWood,
                    finish: studioFinish,
                    width: studioWidth,
                  },
                });
              }}
            >
              <div className="studio-form-heading">
                <span className="form-step">01 — YOUR DESIGN BRIEF</span>
                <span className="ur" lang="ur" dir="rtl">
                  آپ کی پسند کی تفصیل
                </span>
              </div>
              <div className="field">
                <label htmlFor="studio-design">
                  The piece{' '}
                  <span className="ur" lang="ur" dir="rtl">
                    فرنیچر کی قسم
                  </span>
                </label>
                <select
                  id="studio-design"
                  value={studioProject}
                  onChange={(e) => setStudioProject(e.target.value)}
                >
                  <option value="living">Baithak &amp; seating / بیٹھک</option>
                  <option value="bedroom">Bedroom / بیڈروم</option>
                  <option value="kitchen">Kitchen cabinetry / کچن کیبنٹ</option>
                  <option value="storage">Wardrobe &amp; storage / الماری</option>
                  <option value="doors">Wooden door / دروازہ</option>
                  <option value="office">Study desk / مطالعے کی میز</option>
                  <option value="custom">Custom woodwork / خاص لکڑی کا کام</option>
                </select>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="studio-wood">
                    Wood preference{' '}
                    <span className="ur" lang="ur" dir="rtl">
                      لکڑی
                    </span>
                  </label>
                  <select
                    id="studio-wood"
                    value={studioWood}
                    onChange={(e) => setStudioWood(e.target.value as 'sheesham' | 'deodar' | 'ash')}
                  >
                    <option value="sheesham">Sheesham / شیشم</option>
                    <option value="deodar">Deodar / دیودار</option>
                    <option value="ash">Ash / ایش</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="studio-finish">
                    Finish{' '}
                    <span className="ur" lang="ur" dir="rtl">
                      پالش
                    </span>
                  </label>
                  <select
                    id="studio-finish"
                    value={studioFinish}
                    onChange={(e) => setStudioFinish(e.target.value as 'natural' | 'walnut' | 'dark')}
                  >
                    <option value="natural">Natural / قدرتی</option>
                    <option value="walnut">Walnut / اخروٹی</option>
                    <option value="dark">Deep brown / گہری بھوری</option>
                  </select>
                </div>
              </div>
              <div className="field range-field">
                <label htmlFor="studio-width">
                  Approximate width{' '}
                  <span className="ur" lang="ur" dir="rtl">
                    اندازاً چوڑائی
                  </span>
                  <output id="studio-width-output" htmlFor="studio-width">
                    <Bi
                      en={`${studioWidth} cm`}
                      ur={`${toUrduDigits(studioWidth)} سینٹی میٹر`}
                    />
                  </output>
                </label>
                <input
                  id="studio-width"
                  type="range"
                  min={100}
                  max={300}
                  step={10}
                  value={studioWidth}
                  onChange={(e) => setStudioWidth(Number(e.target.value))}
                />
                <div className="range-labels">
                  <span>100 cm</span>
                  <span>300 cm</span>
                </div>
              </div>
              <div id="studio-summary" className="studio-summary" role="status">
                <Bi
                  en={`${CATEGORIES[studioProject]?.en} · ${WOODS[studioWood]?.en} · ${FINISHES[studioFinish]?.en} · ${studioWidth} cm wide. Final wood, finish, dimensions and availability are agreed with your quotation.`}
                  ur={`${CATEGORIES[studioProject]?.ur} · ${WOODS[studioWood]?.ur} · ${FINISHES[studioFinish]?.ur} · ${toUrduDigits(studioWidth)} سینٹی میٹر چوڑائی۔ حتمی لکڑی، پالش، پیمائش اور دستیابی کوٹیشن کے ساتھ طے ہوں گی۔`}
                />
              </div>
              <button id="studio-inquire" type="submit" className="button button-dark">
                Discuss this design{' '}
                <span className="ur" lang="ur" dir="rtl">
                  اس پسند پر بات کریں
                </span>
                <svg aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </button>
            </form>
          </div>
        </section>

        {/* Lookbook Carousel */}
        <section id="gallery" className="lookbook section" aria-labelledby="gallery-heading">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  <span />
                  THE PAKISTANI LOOKBOOK
                </p>
                <h2 id="gallery-heading">
                  Find your <em>andaaz.</em>
                </h2>
              </div>
              <div className="heading-aside">
                <h3 className="ur" lang="ur" dir="rtl">
                  ہر گھر کا اپنا انداز۔
                </h3>
                <p>A closer look at the pieces that bring a room together.</p>
                <p className="ur" lang="ur" dir="rtl">
                  اپنی پسند کی تصاویر دیکھیں اور اپنا ڈیزائن منتخب کریں۔
                </p>
              </div>
            </div>

            {currentGalleryItem && (
              <div className="gallery-shell">
                <div
                  id="gallery-stage"
                  className="gallery-stage"
                  role="region"
                  aria-roledescription="carousel"
                  aria-label="Pakistani furniture inspiration gallery"
                  tabIndex={0}
                >
                  <img
                    id="gallery-image"
                    src={fullPhotoUrl(currentGalleryItem.defaultImage)}
                    alt={`${currentGalleryItem.title.en} / ${currentGalleryItem.title.ur}`}
                    loading="lazy"
                    width="1200"
                    height="900"
                    referrerPolicy="no-referrer"
                  />
                  <div className="gallery-text">
                    <span id="gallery-index">
                      <Bi
                        en={`${String(galleryIndex + 1).padStart(2, '0')} / ${String(
                          galleryProducts.length
                        ).padStart(2, '0')}`}
                        ur={toUrduDigits(
                          `${String(galleryIndex + 1).padStart(2, '0')} / ${String(
                            galleryProducts.length
                          ).padStart(2, '0')}`
                        )}
                      />
                    </span>
                    <h3 id="gallery-title">
                      <Bi
                        en={currentGalleryItem.title.en}
                        ur={currentGalleryItem.title.ur}
                      />
                    </h3>
                    <p id="gallery-caption">
                      <Bi
                        en="Explore this design and include it in your inquiry. Materials, size, price and availability are confirmed before an order."
                        ur="تصویری مجموعے سے اپنی پسند منتخب کریں۔ لکڑی، ناپ، قیمت اور دستیابی آرڈر سے پہلے طے کریں۔"
                      />
                    </p>
                  </div>
                </div>

                <div className="gallery-controls">
                  <p>
                    EXPLORE. SAVE. MAKE IT YOURS.
                    <span className="ur" lang="ur" dir="rtl">
                      دیکھیں، پسند کریں، اپنا بنائیں۔
                    </span>
                  </p>
                  <div id="gallery-dots" className="gallery-dots" role="group" aria-label="Choose gallery slide">
                    {galleryProducts.map((gProd, idx) => (
                      <button
                        key={gProd.id}
                        type="button"
                        className={`gallery-dot${idx === galleryIndex ? ' active' : ''}`}
                        aria-pressed={idx === galleryIndex}
                        aria-label={`Show design ${idx + 1}: ${gProd.title.en}`}
                        onClick={() => setGalleryIndex(idx)}
                      />
                    ))}
                  </div>
                  <div className="gallery-arrows">
                    <button
                      id="gallery-prev"
                      type="button"
                      className="circle-button"
                      aria-label="Previous image / پچھلی تصویر"
                      onClick={() =>
                        setGalleryIndex(
                          (i) => (i - 1 + galleryProducts.length) % galleryProducts.length
                        )
                      }
                    >
                      <svg aria-hidden="true">
                        <use href="#i-prev" />
                      </svg>
                    </button>
                    <button
                      id="gallery-next"
                      type="button"
                      className="circle-button"
                      aria-label="Next image / اگلی تصویر"
                      onClick={() =>
                        setGalleryIndex((i) => (i + 1) % galleryProducts.length)
                      }
                    >
                      <svg aria-hidden="true">
                        <use href="#i-next" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <p className="gallery-disclosure">
              Photos are shown for design selection. Some show installation stages; final
              specifications and availability are confirmed with your inquiry.{' '}
              <span className="ur" lang="ur" dir="rtl">
                اپنی پسند کے لیے تصویری ڈیزائن دیکھیں۔ بعض میں تنصیب کا مرحلہ ہے؛ حتمی تفصیلات اور
                دستیابی پہلے طے کریں۔
              </span>
            </p>
          </div>
        </section>

        {/* Process Section */}
        <section id="process" className="process section container" aria-labelledby="process-title">
          <div className="section-top">
            <p className="eyebrow dark">
              <span />
              FROM IDEA TO YOUR HOME
            </p>
            <h2 id="process-title" className="ur section-urdu" lang="ur" dir="rtl">
              بات آپ کی پسند سے شروع ہوتی ہے
            </h2>
          </div>
          <div className="process-grid">
            <article>
              <span>01 / SHARE</span>
              <h3>First, your idea.</h3>
              <h4 className="ur" lang="ur" dir="rtl">
                پہلے آپ کی بات
              </h4>
              <p>Share your inspiration, room measurements and preferred style.</p>
              <p className="ur" lang="ur" dir="rtl">
                اپنی پسند کی تصویر، کمرے کا ناپ اور ضرورت بتائیں۔
              </p>
            </article>
            <article>
              <span>02 / REFINE</span>
              <h3>Then, the details.</h3>
              <h4 className="ur" lang="ur" dir="rtl">
                پھر لکڑی اور تفصیلات
              </h4>
              <p>Agree on wood, polish, upholstery, budget and the final quotation.</p>
              <p className="ur" lang="ur" dir="rtl">
                لکڑی، پالش، کپڑا اور قیمت باہمی مشورے سے طے کریں۔
              </p>
            </article>
            <article>
              <span>03 / CREATE</span>
              <h3>Finally, your piece.</h3>
              <h4 className="ur" lang="ur" dir="rtl">
                اور پھر آپ کا فرنیچر
              </h4>
              <p>
                Making begins after approval. Timing, delivery and installation are confirmed
                together.
              </p>
              <p className="ur" lang="ur" dir="rtl">
                منظوری کے بعد تیاری؛ وقت، ترسیل اور تنصیب پہلے طے کریں۔
              </p>
            </article>
          </div>
        </section>

        {/* Team Guidance Section */}
        <section id="team" className="team section" aria-labelledby="team-heading">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow dark">
                  <span />
                  A CONVERSATION THAT HELPS
                </p>
                <h2 id="team-heading">
                  Good work starts
                  <br />
                  with <em>good guidance.</em>
                </h2>
              </div>
              <div className="heading-aside">
                <h3 className="ur" lang="ur" dir="rtl">
                  صحیح مشورہ، بہتر انتخاب۔
                </h3>
                <p>Discuss your design, materials or project plan.</p>
                <p className="ur" lang="ur" dir="rtl">
                  ڈیزائن، لکڑی یا اپنے کام کی منصوبہ بندی پر بات کریں۔
                </p>
              </div>
            </div>

            <div id="team-grid" className="team-grid">
              {TEAM_PROFILES.map((profile) => (
                <article key={profile.id} className="team-card">
                  <div className="team-photo team-symbol">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <use href={`#${profile.symbol}`} />
                    </svg>
                    <span className="demo-tag">
                      <Bi en="How we can help" ur="آپ کی رہنمائی" />
                    </span>
                  </div>
                  <div className="team-content">
                    <p className="team-role">
                      <Bi en={profile.role.en} ur={profile.role.ur} />
                    </p>
                    <h3 className="team-title">
                      <Bi en={profile.title.en} ur={profile.title.ur} />
                    </h3>
                    <p className="team-description">
                      <Bi en={profile.description.en} ur={profile.description.ur} />
                    </p>
                    <button
                      type="button"
                      className="team-contact"
                      onClick={() => openQuoteModal({ messagePrompt: profile.inquiry })}
                    >
                      <span className="team-contact-label">
                        <Bi en={profile.action.en} ur={profile.action.ur} />
                      </span>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <use href="#i-arrow" />
                      </svg>
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <p className="section-disclosure">
              Choose the kind of guidance you need; these buttons prepare an inquiry for{' '}
              {config.brand}.{' '}
              <span className="ur" lang="ur" dir="rtl">
                اپنی ضرورت کی رہنمائی منتخب کریں؛ ان بٹنوں سے شہباز فرنیچر کے لیے درخواست تیار ہوتی
                ہے۔
              </span>
            </p>
          </div>
        </section>

        {/* Reviews Section */}
        <section id="reviews" className="reviews section" aria-labelledby="reviews-heading">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  <span />
                  THE WAY A HOME SHOULD FEEL
                </p>
                <h2 id="reviews-heading">
                  A little comfort.
                  <br />
                  <em>A lot of apnapan.</em>
                </h2>
              </div>
              <div className="heading-aside">
                <h3 className="ur" lang="ur" dir="rtl">
                  اپنے گھر کی اپنی بات۔
                </h3>
                <p>Explore customer feedback, or share a design thought of your own.</p>
                <button
                  id="review-open"
                  type="button"
                  className="button button-gold"
                  onClick={() => {
                    setRevError('');
                    setActiveModal('review');
                  }}
                >
                  Write a review{' '}
                  <span className="ur" lang="ur" dir="rtl">
                    اپنی رائے دیں
                  </span>
                  <svg className="inline-arrow" aria-hidden="true">
                    <use href="#i-arrow" />
                  </svg>
                </button>
              </div>
            </div>

            <div
              id="reviews-track"
              className="reviews-track"
              role="region"
              aria-label="Reviews / آراء"
              tabIndex={0}
            >
              {approvedReviews.map((rev) => (
                <article key={rev.id} className="review-card">
                  <div
                    className="review-stars"
                    role="img"
                    aria-label={`${rev.rating} out of 5 stars — ۵ میں سے ${rev.rating} ستارے`}
                  >
                    {[0, 1, 2, 3, 4].map((starIdx) => (
                      <svg
                        key={starIdx}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        style={{ fill: starIdx < rev.rating ? 'currentColor' : 'none' }}
                      >
                        <use href="#i-star" />
                      </svg>
                    ))}
                  </div>
                  <span className="demo-tag">
                    <Bi
                      en={rev.sample ? 'Sample review' : 'Verified Entry'}
                      ur={rev.sample ? 'نمونہ تبصرہ' : 'تصدیق شدہ رائے'}
                    />
                  </span>
                  <blockquote className="review-text">
                    {rev.text.en === rev.text.ur ? (
                      <span className="bi-en user-review-text" dir="auto">
                        {rev.text.en}
                      </span>
                    ) : (
                      <Bi en={rev.text.en} ur={rev.text.ur} />
                    )}
                  </blockquote>
                  <div className="review-author">
                    <span className="review-initials" aria-hidden="true">
                      {rev.initials}
                    </span>
                    <div className="review-person">
                      <strong className="review-name">{rev.name}</strong>
                      <span className="review-city">
                        {rev.city.en === rev.city.ur ? (
                          rev.city.en
                        ) : (
                          <Bi en={rev.city.en} ur={rev.city.ur} />
                        )}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="reviews-bottom">
              <p id="reviews-status" role="status">
                {hasSubmittedReview ? (
                  <Bi
                    en="Your review has been saved and published to the showroom."
                    ur="آپ کا تبصرہ محفوظ کر کے شامل کر دیا گیا ہے۔"
                  />
                ) : (
                  <Bi
                    en="Sample and customer reviews · صارفین کی آراء"
                    ur="نمونہ اور صارفین کی آراء"
                  />
                )}
              </p>
              <div className="reviews-navigation">
                <span id="reviews-index">
                  {Math.min(reviewIndex + 1, Math.max(1, approvedReviews.length))} /{' '}
                  {approvedReviews.length}
                </span>
                <button
                  id="reviews-prev"
                  type="button"
                  className="circle-button"
                  aria-label="Previous review / پچھلی رائے"
                  disabled={reviewIndex <= 0}
                  onClick={() => {
                    const nextIdx = Math.max(0, reviewIndex - 1);
                    setReviewIndex(nextIdx);
                    const track = document.getElementById('reviews-track');
                    const card = track?.querySelectorAll('.review-card')[nextIdx];
                    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                  }}
                >
                  <svg aria-hidden="true">
                    <use href="#i-prev" />
                  </svg>
                </button>
                <button
                  id="reviews-next"
                  type="button"
                  className="circle-button"
                  aria-label="Next review / اگلی رائے"
                  disabled={reviewIndex >= approvedReviews.length - 1}
                  onClick={() => {
                    const nextIdx = Math.min(approvedReviews.length - 1, reviewIndex + 1);
                    setReviewIndex(nextIdx);
                    const track = document.getElementById('reviews-track');
                    const card = track?.querySelectorAll('.review-card')[nextIdx];
                    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                  }}
                >
                  <svg aria-hidden="true">
                    <use href="#i-next" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="faq section container" aria-labelledby="faq-title">
          <div className="faq-heading">
            <p className="eyebrow dark">
              <span />
              A FEW DETAILS, CLEARED UP
            </p>
            <h2 id="faq-title">
              Ask away.
              <br />
              <em>We’re listening.</em>
            </h2>
            <h3 className="ur" lang="ur" dir="rtl">
              آپ کے سوال، ہمارے جواب۔
            </h3>
            <a
              href={defaultWaLink}
              className="text-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ask on WhatsApp{' '}
              <svg aria-hidden="true">
                <use href="#i-arrow" />
              </svg>
            </a>
          </div>
          <div className="faq-list">
            <details>
              <summary>
                <span>
                  Can I change the size or design?
                  <small className="ur" lang="ur" dir="rtl">
                    کیا سائز اور ڈیزائن بدل سکتے ہیں؟
                  </small>
                </span>
                <i>+</i>
              </summary>
              <p>
                Yes. Share your room dimensions and inspiration. Final specifications and
                feasibility are agreed before the order.
              </p>
              <p className="ur" lang="ur" dir="rtl">
                جی ہاں۔ کمرے کا ناپ اور پسند بتائیں؛ حتمی ڈیزائن اور بناوٹ آرڈر سے پہلے طے ہوں گے۔
              </p>
            </details>
            <details>
              <summary>
                <span>
                  How do I get a price?
                  <small className="ur" lang="ur" dir="rtl">
                    قیمت کیسے معلوم ہوگی؟
                  </small>
                </span>
                <i>+</i>
              </summary>
              <p>
                Send the design, size, wood and finish you prefer. A quotation is prepared after
                discussing these details; no fixed prices are shown for custom work.
              </p>
              <p className="ur" lang="ur" dir="rtl">
                ڈیزائن، سائز، لکڑی اور پالش کی پسند بتائیں۔ تفصیلات سمجھنے کے بعد قیمت دی جائے گی۔
              </p>
            </details>
            <details>
              <summary>
                <span>
                  Can I share my own reference photo?
                  <small className="ur" lang="ur" dir="rtl">
                    کیا اپنی پسند کی تصویر بھیج سکتے ہیں؟
                  </small>
                </span>
                <i>+</i>
              </summary>
              <p>
                Absolutely. Open WhatsApp and attach your inspiration photo with your measurements
                and requirements.
              </p>
              <p className="ur" lang="ur" dir="rtl">
                بالکل۔ واٹس ایپ پر اپنی پسند کی تصویر، ناپ اور ضرورت کی تفصیل بھیجیں۔
              </p>
            </details>
            <details>
              <summary>
                <span>
                  What about delivery and installation?
                  <small className="ur" lang="ur" dir="rtl">
                    ترسیل اور تنصیب کا کیا طریقہ ہے؟
                  </small>
                </span>
                <i>+</i>
              </summary>
              <p>
                Share your city and site requirements. Availability, charges, access and
                installation are confirmed with the quotation.
              </p>
              <p className="ur" lang="ur" dir="rtl">
                اپنا شہر اور جگہ کی تفصیل بتائیں۔ دستیابی، اخراجات اور تنصیب کی بات قیمت کے ساتھ طے
                ہوگی۔
              </p>
            </details>
          </div>
        </section>

        {/* Contact CTA Section */}
        <section id="contact" className="contact-section">
          <div className="container">
            <p className="eyebrow">
              <span />
              LET’S MAKE SOMETHING PERSONAL
            </p>
            <h2>
              A little riwayat.
              <br />
              <em>A whole lot of you.</em>
            </h2>
            <p className="ur" lang="ur" dir="rtl">
              آپ کے گھر کے لیے، آپ کی پسند سے۔
            </p>
            <button
              type="button"
              className="button button-gold"
              onClick={() => openQuoteModal()}
            >
              Start your project{' '}
              <span className="ur" lang="ur" dir="rtl">
                اپنا کام شروع کریں
              </span>
              <svg aria-hidden="true">
                <use href="#i-arrow" />
              </svg>
            </button>
            <a className="contact-phone" href={`tel:${config.phoneDisplay.replace(/\s+/g, '')}`}>
              {config.phoneDisplay}
            </a>
          </div>
          <svg className="contact-flower" aria-hidden="true">
            <use href="#i-flower" />
          </svg>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <a className="brand" href="#home">
              <span className="brand-mark">
                SF<span>PK</span>
              </span>
              <span className="brand-name">
                {config.brand.split(' ')[0] || 'Shahbaz'}
                <span>{config.brand.split(' ').slice(1).join(' ').toUpperCase() || 'FURNITURE'}</span>
              </span>
            </a>
            <p>Pakistani roots. Furniture with character.</p>
            <p className="ur" lang="ur" dir="rtl">
              روایتی ہنر، اپنائیت کا احساس۔
            </p>
          </div>
          <div className="footer-links">
            <h3>EXPLORE / دیکھیں</h3>
            <a href="#collection">Our collection · ہمارے ڈیزائن</a>
            <a href="#studio">Custom furniture · اپنی پسند</a>
            <a href="#team">Our people · رہنمائی</a>
            <a href="#faq">FAQs · سوالات</a>
          </div>
          <div className="footer-contact">
            <h3>LET’S TALK / بات کریں</h3>
            <a href={`tel:${config.phoneDisplay.replace(/\s+/g, '')}`}>{config.phoneDisplay}</a>
            <a href={defaultWaLink} target="_blank" rel="noopener noreferrer">
              WhatsApp inquiries{' '}
              <svg className="inline-arrow" aria-hidden="true">
                <use href="#i-arrow" />
              </svg>
            </a>
            <p className="ur" lang="ur" dir="rtl">
              اپنا ڈیزائن اور ناپ ہمیں بھیجیں۔
            </p>
          </div>
        </div>
        <div className="footer-bottom container">
          <span>© 2026 {config.brand}.</span>
          <span>Design photographs · Customer reviews</span>
          <a href="https://wzdev.pk" target="_blank" rel="noopener noreferrer">
            Website by WZDEV{' '}
            <svg className="inline-arrow" aria-hidden="true">
              <use href="#i-arrow" />
            </svg>
          </a>
        </div>
      </footer>

      {/* Floating Creator & WhatsApp Links */}
      <a
        className="creator-float"
        title="Created by WZDEV · wzdev.pk"
        href="https://wzdev.pk"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Website created by WZDEV — visit wzdev.pk"
      >
        <span className="creator-monogram">WZ</span>
        <span>
          <small>CRAFTED BY</small>
          <strong>
            WZDEV{' '}
            <b>
              <svg className="inline-arrow" aria-hidden="true">
                <use href="#i-arrow" />
              </svg>
            </b>
          </strong>
        </span>
      </a>

      <a
        className="whatsapp-float"
        href={defaultWaLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat with ${config.brand} on WhatsApp`}
      >
        <svg aria-hidden="true">
          <use href="#i-wa" />
        </svg>
        <span>
          Let’s talk
          <small className="ur" lang="ur" dir="rtl">
            واٹس ایپ پر بات کریں
          </small>
        </span>
      </a>

      {/* Toast Notification */}
      <div
        id="toast"
        className={`toast${toastMsg ? ' is-visible' : ''}`}
        role="status"
      >
        {toastMsg && <Bi en={toastMsg.en} ur={toastMsg.ur} />}
      </div>

      {/* DIALOG 1: PRODUCT DETAIL */}
      {activeModal === 'detail' && selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <dialog
            open
            id="design-dialog"
            className="design-dialog"
            aria-labelledby="detail-title"
            style={{ position: 'relative', margin: 'auto' }}
          >
            <button
              type="button"
              className="dialog-close"
              aria-label="Close / بند کریں"
              onClick={() => setActiveModal(null)}
            >
              ×
            </button>
            <div className="detail-layout">
              <div className="detail-photo">
                <img
                  id="detail-image"
                  src={fullPhotoUrl(detailImages[detailPhotoIndex] || selectedProduct.defaultImage)}
                  alt={`${selectedProduct.title.en} — view ${detailPhotoIndex + 1}`}
                  width="1200"
                  height="900"
                  referrerPolicy="no-referrer"
                />
                <div className="detail-photo-toolbar">
                  <span id="detail-photo-count">
                    <Bi
                      en={`${detailPhotoIndex + 1} / ${detailImages.length} photos`}
                      ur={`${toUrduDigits(detailPhotoIndex + 1)} / ${toUrduDigits(
                        detailImages.length
                      )} تصاویر`}
                    />
                  </span>
                  <a
                    id="detail-fullsize"
                    href={fullPhotoUrl(
                      detailImages[detailPhotoIndex] || selectedProduct.defaultImage
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View full photo · پوری تصویر
                  </a>
                </div>
                {detailImages.length > 1 && (
                  <div
                    id="detail-thumbnails"
                    className="detail-thumbnails"
                    aria-label="Additional design photographs"
                  >
                    {detailImages.map((imgSrc, idx) => (
                      <button
                        key={imgSrc}
                        type="button"
                        aria-pressed={idx === detailPhotoIndex}
                        aria-label={`View photo ${idx + 1}`}
                        onClick={() => setDetailPhotoIndex(idx)}
                      >
                        <img
                          src={photoThumb(imgSrc)}
                          alt=""
                          width="90"
                          height="75"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                )}
                <span className="concept-tag">PHOTO REFERENCE · ڈیزائن کی تصویر</span>
              </div>

              <div className="detail-content">
                <p id="detail-category" className="eyebrow dark">
                  <Bi
                    en={CATEGORIES[selectedProduct.category]?.en || selectedProduct.category}
                    ur={CATEGORIES[selectedProduct.category]?.ur || ''}
                  />
                </p>
                <h2 id="detail-title">
                  <Bi en={selectedProduct.title.en} ur={selectedProduct.title.ur} />
                </h2>
                <p id="detail-description">
                  <Bi
                    en={selectedProduct.description.en}
                    ur={selectedProduct.description.ur}
                  />
                </p>
                <ul id="detail-specs">
                  {selectedProduct.specs.en.map((specEn, idx) => (
                    <li key={idx}>
                      <Bi
                        en={specEn}
                        ur={selectedProduct.specs.ur[idx] || ''}
                      />
                    </li>
                  ))}
                </ul>
                <p className="detail-note">
                  Final wood, size, price and timing are confirmed before the order.
                  <span className="ur" lang="ur" dir="rtl">
                    آرڈر سے پہلے لکڑی، سائز، قیمت اور وقت کی تصدیق کریں۔
                  </span>
                </p>
                <button
                  id="detail-inquire"
                  type="button"
                  className="button button-dark"
                  onClick={() => openQuoteModal({ productId: selectedProduct.id })}
                >
                  Discuss this design{' '}
                  <span className="ur" lang="ur" dir="rtl">
                    اس ڈیزائن پر بات کریں
                  </span>
                  <svg className="inline-arrow" aria-hidden="true">
                    <use href="#i-arrow" />
                  </svg>
                </button>
                <button
                  id="detail-save"
                  type="button"
                  className={`text-button${
                    savedIds.includes(selectedProduct.id) ? ' is-saved' : ''
                  }`}
                  aria-pressed={savedIds.includes(selectedProduct.id)}
                  onClick={() => toggleSaved(selectedProduct.id)}
                >
                  <Bi
                    en={savedIds.includes(selectedProduct.id) ? 'Saved' : 'Save design'}
                    ur={
                      savedIds.includes(selectedProduct.id)
                        ? 'محفوظ شدہ'
                        : 'ڈیزائن محفوظ کریں'
                    }
                  />
                </button>
              </div>
            </div>
          </dialog>
        </div>
      )}

      {/* DIALOG 2: SAVED SHORTLIST */}
      {activeModal === 'saved' && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <dialog
            open
            id="saved-dialog"
            className="saved-dialog"
            aria-labelledby="saved-title"
            style={{ position: 'relative', margin: 'auto' }}
          >
            <button
              type="button"
              className="dialog-close"
              aria-label="Close / بند کریں"
              onClick={() => setActiveModal(null)}
            >
              ×
            </button>
            <p className="eyebrow dark">YOUR PERSONAL SELECTION</p>
            <h2 id="saved-title">The ones you love.</h2>
            <h3 className="ur dialog-urdu" lang="ur" dir="rtl">
              آپ کے پسندیدہ ڈیزائن
            </h3>
            <p>Keep your ideas together and include them in one inquiry.</p>
            <div id="saved-items" className="saved-items">
              {savedIds.length === 0 ? (
                <div className="saved-empty">
                  <h3>
                    <Bi
                      en="Your favourite designs belong here."
                      ur="آپ کے پسندیدہ ڈیزائن یہاں محفوظ ہوں گے۔"
                    />
                  </h3>
                  <p>
                    <Bi
                      en="Save a few pieces from the collection, then bring them together in a project inquiry."
                      ur="مجموعے سے اپنی پسند کے چند ڈیزائن محفوظ کریں، پھر کام کی تفصیل میں انہیں شامل کریں۔"
                    />
                  </p>
                </div>
              ) : (
                savedIds.map((id) => {
                  const prod = productMap.get(id);
                  if (!prod) return null;
                  return (
                    <article key={id} className="saved-item">
                      <button
                        type="button"
                        className="saved-image product-open"
                        onClick={() => openProductDetail(id)}
                      >
                        <img
                          src={photoThumb(prod.defaultImage)}
                          alt={prod.title.en}
                          loading="lazy"
                          width="160"
                          height="180"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                      <div className="saved-copy">
                        <small>
                          <Bi
                            en={CATEGORIES[prod.category]?.en || prod.category}
                            ur={CATEGORIES[prod.category]?.ur || ''}
                          />
                        </small>
                        <h3>
                          <button
                            type="button"
                            className="product-open"
                            onClick={() => openProductDetail(id)}
                          >
                            <Bi en={prod.title.en} ur={prod.title.ur} />
                          </button>
                        </h3>
                        <button
                          type="button"
                          className="saved-remove"
                          onClick={() => toggleSaved(id)}
                        >
                          <Bi en="Remove" ur="ہٹائیں" />
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
            <div className="saved-actions">
              <button
                id="saved-inquire"
                type="button"
                className="button button-dark"
                disabled={savedIds.length === 0}
                onClick={() => openQuoteModal()}
              >
                Discuss my shortlist · میری پسند پر بات کریں{' '}
                <svg className="inline-arrow" aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </button>
              <button
                id="saved-clear"
                type="button"
                className="text-button"
                disabled={savedIds.length === 0}
                onClick={clearSaved}
              >
                Clear all · فہرست خالی کریں
              </button>
            </div>
          </dialog>
        </div>
      )}

      {/* DIALOG 3: QUOTE / PROJECT INQUIRY */}
      {activeModal === 'quote' && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <dialog
            open
            id="quote-dialog"
            className="quote-dialog"
            aria-labelledby="quote-title"
            style={{ position: 'relative', margin: 'auto' }}
          >
            <button
              type="button"
              className="dialog-close"
              aria-label="Close / بند کریں"
              onClick={() => setActiveModal(null)}
            >
              ×
            </button>
            <p className="eyebrow dark">A LITTLE DETAIL GOES A LONG WAY</p>
            <h2 id="quote-title">Let’s shape your idea.</h2>
            <h3 className="ur dialog-urdu" lang="ur" dir="rtl">
              اپنی پسند اور ضرورت بتائیں۔
            </h3>
            <p>Prepare your inquiry, review it, then continue on WhatsApp.</p>
            <p className="ur" lang="ur" dir="rtl">
              اپنا پیغام تیار کریں، پڑھیں، پھر واٹس ایپ پر جاری رکھیں۔
            </p>

            <p id="quote-selection" className="quote-selection">
              {quoteDesignIds.length > 0 || quoteStudio ? (
                <Bi
                  en={[
                    quoteDesignIds.length > 0
                      ? `Selected designs: ${quoteDesignIds
                          .map((id) => productMap.get(id)?.title.en)
                          .filter(Boolean)
                          .join(', ')}`
                      : '',
                    quoteStudio
                      ? `Your design direction: ${CATEGORIES[quoteStudio.project]?.en} · ${WOODS[quoteStudio.wood]?.en} · ${FINISHES[quoteStudio.finish]?.en} · ${quoteStudio.width} cm wide`
                      : '',
                  ]
                    .filter(Boolean)
                    .join('\n')}
                  ur={[
                    quoteDesignIds.length > 0
                      ? `منتخب ڈیزائن: ${quoteDesignIds
                          .map((id) => productMap.get(id)?.title.ur)
                          .filter(Boolean)
                          .join('، ')}`
                      : '',
                    quoteStudio
                      ? `آپ کی پسند کی تفصیل: ${CATEGORIES[quoteStudio.project]?.ur} · ${WOODS[quoteStudio.wood]?.ur} · ${FINISHES[quoteStudio.finish]?.ur} · ${toUrduDigits(quoteStudio.width)} سینٹی میٹر چوڑائی`
                      : '',
                  ]
                    .filter(Boolean)
                    .join('\n')}
                />
              ) : (
                <Bi
                  en="No catalogue designs selected. Tell us about your project below."
                  ur="ابھی کوئی ڈیزائن منتخب نہیں کیا گیا۔ اپنے کام کی تفصیل نیچے لکھیں۔"
                />
              )}
            </p>

            <form id="quote-form" onSubmit={handleQuoteSubmit} noValidate>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="quote-name">
                    Your name *{' '}
                    <span className="ur" lang="ur" dir="rtl">
                      آپ کا نام
                    </span>
                  </label>
                  <input
                    id="quote-name"
                    name="name"
                    required
                    maxLength={80}
                    value={quoteName}
                    onChange={(e) => {
                      setQuoteName(e.target.value);
                      setPreparedQuoteText('');
                    }}
                    placeholder="Ahmed Ali / احمد علی"
                  />
                  {quoteErrors.name && (
                    <small role="alert" style={{ color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>
                      {quoteErrors.name}
                    </small>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="quote-phone">
                    Phone / WhatsApp *{' '}
                    <span className="ur" lang="ur" dir="rtl">
                      فون نمبر
                    </span>
                  </label>
                  <input
                    id="quote-phone"
                    name="phone"
                    type="tel"
                    dir="ltr"
                    required
                    maxLength={25}
                    value={quotePhone}
                    onChange={(e) => {
                      setQuotePhone(toLatinDigits(e.target.value));
                      setPreparedQuoteText('');
                    }}
                    placeholder="03XX XXX XXXX"
                  />
                  {quoteErrors.phone && (
                    <small role="alert" style={{ color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>
                      {quoteErrors.phone}
                    </small>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="quote-city">
                    Your city{' '}
                    <span className="ur" lang="ur" dir="rtl">
                      آپ کا شہر
                    </span>
                  </label>
                  <input
                    id="quote-city"
                    name="city"
                    maxLength={80}
                    value={quoteCity}
                    onChange={(e) => {
                      setQuoteCity(e.target.value);
                      setPreparedQuoteText('');
                    }}
                    placeholder="Lahore / لاہور"
                  />
                </div>
                <div className="field">
                  <label htmlFor="quote-project">
                    Project type *{' '}
                    <span className="ur" lang="ur" dir="rtl">
                      کام کی قسم
                    </span>
                  </label>
                  <select
                    id="quote-project"
                    name="project"
                    required
                    value={quoteProject}
                    onChange={(e) => {
                      setQuoteProject(e.target.value);
                      setPreparedQuoteText('');
                    }}
                  >
                    <option value="" disabled>
                      Choose / منتخب کریں
                    </option>
                    <option value="living">Baithak &amp; seating / بیٹھک</option>
                    <option value="bedroom">Bedroom / بیڈروم</option>
                    <option value="kitchen">Kitchen cabinetry / کچن کیبنٹ</option>
                    <option value="storage">Wardrobes &amp; storage / الماری</option>
                    <option value="doors">Doors / دروازے</option>
                    <option value="office">Study &amp; office / دفتر</option>
                    <option value="custom">Custom woodwork / خاص لکڑی کا کام</option>
                  </select>
                  {quoteErrors.project && (
                    <small role="alert" style={{ color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>
                      {quoteErrors.project}
                    </small>
                  )}
                </div>
              </div>

              <div className="field">
                <label htmlFor="quote-message">
                  Your idea and requirements *{' '}
                  <span className="ur" lang="ur" dir="rtl">
                    آپ کی پسند اور ضرورت
                  </span>
                </label>
                <textarea
                  id="quote-message"
                  name="message"
                  required
                  minLength={15}
                  maxLength={3500}
                  rows={4}
                  value={quoteMessage}
                  onChange={(e) => {
                    setQuoteMessage(e.target.value);
                    setPreparedQuoteText('');
                  }}
                  placeholder="Design, size, wood, finish, budget in PKR… / ڈیزائن، ناپ، لکڑی اور بجٹ…"
                />
                {quoteErrors.message && (
                  <small role="alert" style={{ color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>
                    {quoteErrors.message}
                  </small>
                )}
              </div>

              <button className="button button-dark" type="submit">
                Review my inquiry · اپنا پیغام دیکھیں{' '}
                <svg className="inline-arrow" aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </button>
            </form>

            {preparedQuoteText && (
              <div id="quote-preview" className="quote-preview">
                <p className="eyebrow dark">YOUR INQUIRY / آپ کا پیغام</p>
                <pre id="quote-summary" dir="ltr">
                  {preparedQuoteText}
                </pre>
                <div className="quote-preview-actions">
                  <a
                    id="quote-wa"
                    className="button button-green"
                    href={`https://wa.me/${whatsappClean}?text=${encodeURIComponent(
                      preparedQuoteText
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg aria-hidden="true">
                      <use href="#i-wa" />
                    </svg>
                    Continue on WhatsApp
                  </a>
                  <button
                    id="quote-copy"
                    className="button button-outline"
                    type="button"
                    onClick={handleCopyPreparedQuote}
                  >
                    Copy message · کاپی کریں
                  </button>
                </div>
              </div>
            )}

            {quoteStatusMsg && (
              <p id="quote-status" className="form-status" role="status">
                <Bi en={quoteStatusMsg.en} ur={quoteStatusMsg.ur} />
              </p>
            )}
          </dialog>
        </div>
      )}

      {/* DIALOG 4: WRITE A REVIEW */}
      {activeModal === 'review' && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <dialog
            open
            id="review-dialog"
            className="review-dialog"
            aria-labelledby="review-title"
            style={{ position: 'relative', margin: 'auto' }}
          >
            <button
              type="button"
              className="dialog-close"
              aria-label="Close / بند کریں"
              onClick={() => setActiveModal(null)}
            >
              ×
            </button>
            <p className="eyebrow dark">YOUR THOUGHTS MATTER</p>
            <h2 id="review-title">A word from you.</h2>
            <h3 className="ur dialog-urdu" lang="ur" dir="rtl">
              اپنی رائے بتائیں۔
            </h3>
            <p>Share your experience or your thoughts on our furniture designs.</p>
            <p className="ur" lang="ur" dir="rtl">
              ہمارے فرنیچر ڈیزائن کے بارے میں اپنا تجربہ یا رائے تحریر کریں۔
            </p>
            <form id="review-form" onSubmit={handleReviewSubmit} noValidate>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="review-name">
                    Your name *{' '}
                    <span className="ur" lang="ur" dir="rtl">
                      آپ کا نام
                    </span>
                  </label>
                  <input
                    id="review-name"
                    name="name"
                    required
                    maxLength={60}
                    value={revName}
                    onChange={(e) => setRevName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="review-city">
                    Your city{' '}
                    <span className="ur" lang="ur" dir="rtl">
                      آپ کا شہر
                    </span>
                  </label>
                  <input
                    id="review-city"
                    name="city"
                    maxLength={80}
                    value={revCity}
                    onChange={(e) => setRevCity(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="review-rating">
                  Your rating *{' '}
                  <span className="ur" lang="ur" dir="rtl">
                    درجہ بندی
                  </span>
                </label>
                <select
                  id="review-rating"
                  name="rating"
                  required
                  value={revRating}
                  onChange={(e) => setRevRating(Number(e.target.value))}
                >
                  <option value={5}>5 — Excellent / بہترین</option>
                  <option value={4}>4 — Very good / بہت اچھا</option>
                  <option value={3}>3 — Good / اچھا</option>
                  <option value={2}>2 — Fair / مناسب</option>
                  <option value={1}>1 — Needs improvement / بہتری کی ضرورت</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="review-message">
                  Your review *{' '}
                  <span className="ur" lang="ur" dir="rtl">
                    آپ کا تبصرہ
                  </span>
                </label>
                <textarea
                  id="review-message"
                  name="review"
                  required
                  minLength={20}
                  maxLength={700}
                  rows={4}
                  value={revText}
                  onChange={(e) => setRevText(e.target.value)}
                  placeholder="Your experience or design preference… / آپ کی رائے…"
                />
              </div>
              {revError && (
                <p role="alert" style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  {revError}
                </p>
              )}
              <button className="button button-dark" type="submit">
                Add my review · رائے شامل کریں
              </button>
            </form>
          </dialog>
        </div>
      )}
    </>
  );
}
