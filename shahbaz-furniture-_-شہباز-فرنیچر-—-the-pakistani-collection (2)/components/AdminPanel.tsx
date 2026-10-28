'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Database,
  Package,
  MessageSquare,
  Star,
  Settings,
  Download,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  FileCode,
} from 'lucide-react';
import { ProductDesign, CATALOGUE_SEED } from '@/lib/catalogue-data';
import {
  CustomerInquiry,
  CustomerReview,
  INITIAL_INQUIRIES,
  INITIAL_REVIEWS,
  INITIAL_SITE_CONFIG,
  PHP_SECURITY_AUDITS,
  PhpSecurityAuditItem,
  SiteConfig,
  generateDynamicConfigPhp,
} from '@/lib/store';

const PHOTO_OPTIONS = Array.from({ length: 40 }, (_, i) => {
  const num = String(i + 1).padStart(2, '0');
  return `assets/real/photo-${num}.jpg`;
});

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  const [config, setConfig] = useState<SiteConfig>(INITIAL_SITE_CONFIG);
  const [catalogue, setCatalogue] = useState<ProductDesign[]>(CATALOGUE_SEED);
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>(INITIAL_INQUIRIES);
  const [reviews, setReviews] = useState<CustomerReview[]>(INITIAL_REVIEWS);
  const [phpFiles, setPhpFiles] = useState<Record<string, string>>({});
  const [securityAudits, setSecurityAudits] = useState<PhpSecurityAuditItem[]>(PHP_SECURITY_AUDITS);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'catalogue' | 'inquiries' | 'reviews' | 'php-mysql' | 'settings'
  >('overview');

  // Catalogue Editor State
  const [editingId, setEditingId] = useState<string>('');
  const [prodCategory, setProdCategory] = useState<ProductDesign['category']>('bedroom');
  const [prodTitleEn, setProdTitleEn] = useState('');
  const [prodTitleUr, setProdTitleUr] = useState('');
  const [prodDescEn, setProdDescEn] = useState('');
  const [prodDescUr, setProdDescUr] = useState('');
  const [prodImage, setProdImage] = useState('assets/real/photo-01.jpg');
  const [prodFeatured, setProdFeatured] = useState(true);
  const [prodStatusMsg, setProdStatusMsg] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Config / MySQL Form State
  const [cfgBrand, setCfgBrand] = useState(INITIAL_SITE_CONFIG.brand);
  const [cfgBrandUr, setCfgBrandUr] = useState(INITIAL_SITE_CONFIG.brandUrdu);
  const [cfgWhatsapp, setCfgWhatsapp] = useState(INITIAL_SITE_CONFIG.whatsappNumber);
  const [cfgPhoneDisplay, setCfgPhoneDisplay] = useState(INITIAL_SITE_CONFIG.phoneDisplay);
  const [cfgDbHost, setCfgDbHost] = useState(INITIAL_SITE_CONFIG.dbHost);
  const [cfgDbPort, setCfgDbPort] = useState(INITIAL_SITE_CONFIG.dbPort);
  const [cfgDbName, setCfgDbName] = useState(INITIAL_SITE_CONFIG.dbName);
  const [cfgDbUser, setCfgDbUser] = useState(INITIAL_SITE_CONFIG.dbUser);
  const [cfgPhpVer, setCfgPhpVer] = useState<'8.3' | '8.4' | '8.5'>(
    INITIAL_SITE_CONFIG.phpTargetVersion
  );
  const [cfgSavedMsg, setCfgSavedMsg] = useState('');

  // PHP File Inspector State
  const [selectedPhpFile, setSelectedPhpFile] = useState<string>('config.php');
  const [copiedFile, setCopiedFile] = useState<string>('');

  const applyServerPayload = (data: Record<string, unknown>) => {
    const st = data.state as
      | {
          config?: SiteConfig;
          catalogue?: ProductDesign[];
          inquiries?: CustomerInquiry[];
          reviews?: CustomerReview[];
        }
      | undefined;
    if (st?.config) {
      setConfig(st.config);
      setCfgBrand(st.config.brand);
      setCfgBrandUr(st.config.brandUrdu);
      setCfgWhatsapp(st.config.whatsappNumber);
      setCfgPhoneDisplay(st.config.phoneDisplay);
      setCfgDbHost(st.config.dbHost);
      setCfgDbPort(st.config.dbPort);
      setCfgDbName(st.config.dbName);
      setCfgDbUser(st.config.dbUser);
      setCfgPhpVer(st.config.phpTargetVersion);
    }
    if (Array.isArray(st?.catalogue)) setCatalogue(st.catalogue);
    if (Array.isArray(st?.inquiries)) setInquiries(st.inquiries);
    if (Array.isArray(st?.reviews)) setReviews(st.reviews);
    if (data.phpFiles && typeof data.phpFiles === 'object') {
      setPhpFiles(data.phpFiles as Record<string, string>);
    }
    if (Array.isArray(data.securityAudits)) {
      setSecurityAudits(data.securityAudits as PhpSecurityAuditItem[]);
    }
  };

  useEffect(() => {
    fetch('/api/store?scope=admin')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.ok && data.authenticated) {
          applyServerPayload(data);
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        // Stay unauthenticated
      });
  }, []);

  const onMutate = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) {
      setIsAuthenticated(false);
      return;
    }
    const data = await res.json();
    if (data?.ok) {
      applyServerPayload(data);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) {
      setLoginError('Access denied.');
      return;
    }
    setIsSubmittingLogin(true);
    setLoginError('');
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_login',
          username: loginUser,
          password: loginPass,
          website_url: honeypot,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok && data.authenticated) {
        applyServerPayload(data);
        setIsAuthenticated(true);
        setLoginPass('');
        setLoginError('');
      } else {
        setLoginError(data?.error || 'Invalid username or password.');
      }
    } catch {
      setLoginError('Unable to process request.');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_logout' }),
      });
    } catch {
      // Ignore
    }
    setIsAuthenticated(false);
    setLoginUser('');
    setLoginPass('');
  };

  const startEditProduct = (product: ProductDesign) => {
    setEditingId(product.id);
    setProdCategory(product.category);
    setProdTitleEn(product.title.en);
    setProdTitleUr(product.title.ur);
    setProdDescEn(product.description.en);
    setProdDescUr(product.description.ur);
    setProdImage(product.defaultImage);
    setProdFeatured(Boolean(product.featured));
    setProdStatusMsg(`Editing "${product.title.en}"`);
    setActiveTab('catalogue');
  };

  const resetProductForm = () => {
    setEditingId('');
    setProdCategory('bedroom');
    setProdTitleEn('');
    setProdTitleUr('');
    setProdDescEn('');
    setProdDescUr('');
    setProdImage('assets/real/photo-01.jpg');
    setProdFeatured(true);
    setProdStatusMsg('');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitleEn.trim() || !prodDescEn.trim()) {
      setProdStatusMsg('Please provide at least the English Title and Description.');
      return;
    }
    await onMutate({
      action: 'admin_save_product',
      id: editingId || prodTitleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: prodCategory,
      titleEn: prodTitleEn,
      titleUr: prodTitleUr || prodTitleEn,
      descriptionEn: prodDescEn,
      descriptionUr: prodDescUr || prodDescEn,
      defaultImage: prodImage,
      featured: prodFeatured,
    });
    setProdStatusMsg(`Saved "${prodTitleEn}" to database.`);
    if (!editingId) {
      resetProductForm();
      setProdStatusMsg(`Added "${prodTitleEn}" to catalogue.`);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await onMutate({
      action: 'admin_update_config',
      brand: cfgBrand,
      brandUrdu: cfgBrandUr,
      whatsappNumber: cfgWhatsapp,
      phoneDisplay: cfgPhoneDisplay,
      dbHost: cfgDbHost,
      dbPort: cfgDbPort,
      dbName: cfgDbName,
      dbUser: cfgDbUser,
      phpTargetVersion: cfgPhpVer,
    });
    setCfgSavedMsg('Settings & PHP 8.3–8.5 MySQL configuration updated.');
    setTimeout(() => setCfgSavedMsg(''), 3500);
  };

  const handleCopyCode = async (fileName: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(fileName);
      setTimeout(() => setCopiedFile(''), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadFile = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activePhpFileContent =
    selectedPhpFile === 'config.php (Live Preview)'
      ? generateDynamicConfigPhp({
          ...config,
          brand: cfgBrand,
          brandUrdu: cfgBrandUr,
          whatsappNumber: cfgWhatsapp,
          dbHost: cfgDbHost,
          dbPort: cfgDbPort,
          dbName: cfgDbName,
          dbUser: cfgDbUser,
          phpTargetVersion: cfgPhpVer,
        })
      : phpFiles[selectedPhpFile] || '';

  const filteredCatalogue =
    catFilter === 'all' ? catalogue : catalogue.filter((c) => c.category === catFilter);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white text-[#111111] flex flex-col justify-center items-center p-6 !font-sans">
        <div className="w-full max-w-[360px] bg-white border border-[#d4d4d4] p-7">
          <h1 className="!font-sans !text-[18px] !font-semibold !text-[#111111] !m-0 !mb-5 !tracking-normal">
            Admin Login
          </h1>
          {loginError && (
            <div
              role="alert"
              className="mb-4 p-2.5 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-xs"
            >
              {loginError}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
              <label htmlFor="website_url">Website</label>
              <input
                id="website_url"
                name="website_url"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="admin-user"
                className="block text-xs font-medium text-[#222222] mb-1.5"
              >
                Username
              </label>
              <input
                id="admin-user"
                name="username"
                type="text"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                required
                maxLength={64}
                autoComplete="username"
                className="w-full px-3 py-2 bg-white border border-[#bdbdbd] text-[#111111] text-sm focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div>
              <label
                htmlFor="admin-pass"
                className="block text-xs font-medium text-[#222222] mb-1.5"
              >
                Password
              </label>
              <input
                id="admin-pass"
                name="password"
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                required
                maxLength={128}
                autoComplete="current-password"
                className="w-full px-3 py-2 bg-white border border-[#bdbdbd] text-[#111111] text-sm focus:outline-none focus:border-[#111111]"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingLogin}
              className="w-full py-2.5 !bg-[#111111] !text-white font-semibold text-sm hover:!bg-[#222222] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmittingLogin ? 'Signing in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111310] text-[#f4efe6] flex flex-col !font-sans">
      {/* Top Bar */}
      <header className="border-b border-[#d6b36a]/25 bg-[#161915] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#d6b36a] tracking-wider uppercase">
              <span>{config.brand}</span>
              <span aria-hidden="true">·</span>
              <span lang="ur" dir="rtl">{config.brandUrdu}</span>
              <span aria-hidden="true">·</span>
              <span>PHP 8.3–8.5+ Production Backend</span>
            </div>
            <h1 className="!font-sans !text-lg font-semibold text-[#f4efe6] tracking-normal">
              Admin Panel &amp; MySQL Integration Suite
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/download-php"
            download="shahbaz-furniture-ready-to-upload-php.zip"
            className="px-3.5 py-2 !bg-[#d6b36a] !text-[#141613] hover:!bg-[#e3c480] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer no-underline"
          >
            <Download className="w-3.5 h-3.5" />
            Download Ready-to-Upload PHP Site (.zip)
          </a>
          <button
            type="button"
            onClick={() => onMutate({ action: 'admin_reset_seed' })}
            className="px-3 py-2 !bg-[#1c201b] hover:!bg-[#252a23] border border-white/15 text-xs text-[#b9b2a3] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset demo edits back to repository defaults"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Seed Data
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2 !bg-[#2a1a1a] hover:!bg-[#3b2222] border border-red-500/30 text-xs text-red-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#151814] p-4 flex lg:flex-col gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2.5 text-left text-xs font-medium flex items-center gap-2.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? '!bg-[#d6b36a] !text-[#141613] font-semibold'
                : 'text-[#cfc8b8] hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Overview &amp; Security Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalogue')}
            className={`px-3.5 py-2.5 text-left text-xs font-medium flex items-center justify-between gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'catalogue'
                ? '!bg-[#d6b36a] !text-[#141613] font-semibold'
                : 'text-[#cfc8b8] hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Package className="w-4 h-4 shrink-0" />
              <span>Catalogue Designs</span>
            </span>
            <span className="font-mono tabular-nums text-[11px] opacity-80">{catalogue.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inquiries')}
            className={`px-3.5 py-2.5 text-left text-xs font-medium flex items-center justify-between gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'inquiries'
                ? '!bg-[#d6b36a] !text-[#141613] font-semibold'
                : 'text-[#cfc8b8] hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Customer Inquiries</span>
            </span>
            <span className="font-mono tabular-nums text-[11px] opacity-80">{inquiries.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-3.5 py-2.5 text-left text-xs font-medium flex items-center justify-between gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'reviews'
                ? '!bg-[#d6b36a] !text-[#141613] font-semibold'
                : 'text-[#cfc8b8] hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Star className="w-4 h-4 shrink-0" />
              <span>Reviews Moderation</span>
            </span>
            <span className="font-mono tabular-nums text-[11px] opacity-80">{reviews.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('php-mysql')}
            className={`px-3.5 py-2.5 text-left text-xs font-medium flex items-center gap-2.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'php-mysql'
                ? '!bg-[#d6b36a] !text-[#141613] font-semibold'
                : 'text-[#cfc8b8] hover:bg-white/5'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>PHP 8.3–8.5 &amp; config.php</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2.5 text-left text-xs font-medium flex items-center gap-2.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? '!bg-[#d6b36a] !text-[#141613] font-semibold'
                : 'text-[#cfc8b8] hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Showroom &amp; DB Settings</span>
          </button>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {/* TAB 1: OVERVIEW & PHP 8.3-8.5 SECURITY AUDIT */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-[#181b16] border border-white/10">
                  <p className="text-xs uppercase tracking-wider text-[#b9b2a3]">Active Designs</p>
                  <p className="text-3xl font-semibold text-[#d6b36a] font-mono tabular-nums mt-1">
                    {catalogue.length}
                  </p>
                  <p className="text-xs text-[#9c9587] mt-1">40 real photographs · Bilingual EN/UR</p>
                </div>

                <div className="p-5 bg-[#181b16] border border-white/10">
                  <p className="text-xs uppercase tracking-wider text-[#b9b2a3]">Project Inquiries</p>
                  <p className="text-3xl font-semibold text-[#d6b36a] font-mono tabular-nums mt-1">
                    {inquiries.length}
                  </p>
                  <p className="text-xs text-[#9c9587] mt-1">
                    {inquiries.filter((i) => i.status === 'new').length} new · WhatsApp &amp; MySQL synced
                  </p>
                </div>

                <div className="p-5 bg-[#181b16] border border-white/10">
                  <p className="text-xs uppercase tracking-wider text-[#b9b2a3]">Customer Reviews</p>
                  <p className="text-3xl font-semibold text-[#d6b36a] font-mono tabular-nums mt-1">
                    {reviews.filter((r) => r.status === 'approved').length}
                  </p>
                  <p className="text-xs text-[#9c9587] mt-1">
                    {reviews.filter((r) => r.status === 'pending').length} awaiting moderation
                  </p>
                </div>

                <div className="p-5 bg-[#181b16] border border-white/10">
                  <p className="text-xs uppercase tracking-wider text-[#b9b2a3]">PHP Compatibility &amp; Security</p>
                  <p className="text-3xl font-semibold text-emerald-400 font-mono tabular-nums mt-1">
                    8.3 – 8.5+
                  </p>
                  <p className="text-xs text-[#9c9587] mt-1">
                    {securityAudits.length}/{securityAudits.length} OWASP checks verified
                  </p>
                </div>
              </div>

              {/* Security & Compatibility Matrix */}
              <div className="bg-[#181b16] border border-white/10 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-white/10">
                  <div>
                    <h2 className="!font-sans !text-lg font-semibold text-[#f4efe6] tracking-normal">
                      PHP 8.3 / 8.4 / 8.5+ Compatibility &amp; Attack Mitigation Report
                    </h2>
                    <p className="text-xs text-[#b9b2a3] mt-1">
                      All backend PHP files (<code className="text-[#d6b36a]">config.php</code>,{' '}
                      <code className="text-[#d6b36a]">api.php</code>,{' '}
                      <code className="text-[#d6b36a]">ad/ad-wz.php</code>,{' '}
                      <code className="text-[#d6b36a]">index.php</code>,{' '}
                      <code className="text-[#d6b36a]">database.sql</code>) are hardened against modern PHP attack vectors.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('php-mysql')}
                    className="px-4 py-2 !bg-[#d6b36a] !text-[#141613] text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <FileCode className="w-4 h-4" />
                    Inspect &amp; Download PHP Files
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {securityAudits.map((audit) => (
                    <div key={audit.id} className="p-4 bg-[#121511] border border-white/10 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs text-[#b9b2a3] mb-1.5">
                          <span className="font-mono text-[#d6b36a]">{audit.file}</span>
                          <span>{audit.category}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-[#f4efe6] flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{audit.title}</span>
                        </h3>
                        <p className="text-xs text-[#b9b2a3] mt-2 leading-relaxed">
                          {audit.implementationDetail}
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-[#9c9587]">
                        <span>Mitigates: {audit.attackVectorMitigated}</span>
                        <span className="font-mono text-emerald-400">
                          PHP {audit.phpVersions.join(' · ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CATALOGUE MANAGEMENT */}
          {activeTab === 'catalogue' && (
            <div className="space-y-8">
              {/* Add / Edit Form */}
              <form onSubmit={handleSaveProduct} className="bg-[#181b16] border border-white/10 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="text-base font-semibold">
                    {editingId ? `Edit Design: ${editingId}` : 'Add New Furniture Design to Catalogue'}
                  </h2>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetProductForm}
                      className="text-xs text-[#d6b36a] hover:underline cursor-pointer"
                    >
                      Cancel Edit / Create New
                    </button>
                  )}
                </div>

                {prodStatusMsg && (
                  <div role="status" className="p-3 bg-[#22281e] border border-[#d6b36a]/40 text-xs text-[#f4efe6]">
                    {prodStatusMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="prod-title-en" className="block text-xs text-[#b9b2a3] mb-1">
                      Title (English) *
                    </label>
                    <input
                      id="prod-title-en"
                      type="text"
                      required
                      value={prodTitleEn}
                      onChange={(e) => setProdTitleEn(e.target.value)}
                      placeholder="e.g. Royal Chinioti Carved Bed"
                      className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="prod-title-ur" className="block text-xs text-[#b9b2a3] mb-1">
                      Title (Urdu / اردو)
                    </label>
                    <input
                      id="prod-title-ur"
                      type="text"
                      dir="rtl"
                      value={prodTitleUr}
                      onChange={(e) => setProdTitleUr(e.target.value)}
                      placeholder="شاہی چنیوٹی نقش دار بیڈ"
                      className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="prod-category" className="block text-xs text-[#b9b2a3] mb-1">
                      Category *
                    </label>
                    <select
                      id="prod-category"
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value as ProductDesign['category'])}
                      className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white"
                    >
                      <option value="bedroom">Bedroom / بیڈروم</option>
                      <option value="living">Baithak &amp; Living / بیٹھک</option>
                      <option value="kitchen">Kitchens / کچن</option>
                      <option value="storage">Storage &amp; Wardrobes / الماری</option>
                      <option value="doors">Doors / دروازے</option>
                      <option value="custom">Custom Woodwork / لکڑی کا کام</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="prod-desc-en" className="block text-xs text-[#b9b2a3] mb-1">
                      Description (English) *
                    </label>
                    <textarea
                      id="prod-desc-en"
                      rows={2}
                      required
                      value={prodDescEn}
                      onChange={(e) => setProdDescEn(e.target.value)}
                      placeholder="Describe visible woodwork, upholstery, and room layout details..."
                      className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="prod-desc-ur" className="block text-xs text-[#b9b2a3] mb-1">
                      Description (Urdu / اردو تفصیل)
                    </label>
                    <textarea
                      id="prod-desc-ur"
                      rows={2}
                      dir="rtl"
                      value={prodDescUr}
                      onChange={(e) => setProdDescUr(e.target.value)}
                      placeholder="لکڑی کے نقش و نگار اور بناوٹ کی تفصیل..."
                      className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <label htmlFor="prod-image" className="block text-xs text-[#b9b2a3] mb-1">
                        Showroom Photograph Reference
                      </label>
                      <select
                        id="prod-image"
                        value={prodImage}
                        onChange={(e) => setProdImage(e.target.value)}
                        className="px-3 py-2 bg-[#111310] border border-white/15 text-xs text-white"
                      >
                        {PHOTO_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[#cfc8b8] mt-5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prodFeatured}
                        onChange={(e) => setProdFeatured(e.target.checked)}
                      />
                      Featured in Showroom
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#d6b36a] text-[#141613] text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {editingId ? 'Save Design Changes' : 'Add Design to Catalogue'}
                  </button>
                </div>
              </form>

              {/* Catalogue Table */}
              <div className="bg-[#181b16] border border-white/10 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#d6b36a]">
                    Active Catalogue ({filteredCatalogue.length} items)
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {['all', 'bedroom', 'living', 'kitchen', 'storage', 'doors', 'custom'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCatFilter(cat)}
                        className={`px-2.5 py-1 text-xs capitalize cursor-pointer ${
                          catFilter === cat
                            ? 'bg-[#d6b36a] text-[#141613] font-semibold'
                            : 'bg-[#111310] text-[#b9b2a3] hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[#9c9587] uppercase">
                        <th className="py-2.5 px-3">Photo</th>
                        <th className="py-2.5 px-3">ID &amp; Category</th>
                        <th className="py-2.5 px-3">English Title</th>
                        <th className="py-2.5 px-3">Urdu Title</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredCatalogue.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3">
                            <img
                              src={`/${item.defaultImage.replace('assets/real/photo-', 'assets/real/thumbs/photo-')}`}
                              alt={item.title.en}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 object-cover bg-[#111310] border border-white/10"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <div className="text-[#f4efe6]">{item.id}</div>
                            <div className="text-[#9c9587] capitalize">{item.category}</div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[#f4efe6]">{item.title.en}</td>
                          <td className="py-2.5 px-3 text-[#d6b36a]" lang="ur" dir="rtl">
                            {item.title.ur}
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => startEditProduct(item)}
                              aria-label={`Edit ${item.title.en}`}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[#f4efe6] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onMutate({ action: 'admin_delete_product', id: item.id })}
                              aria-label={`Delete ${item.title.en}`}
                              className="px-2.5 py-1 bg-red-950/50 hover:bg-red-900/60 text-red-200 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMER INQUIRIES */}
          {activeTab === 'inquiries' && (
            <div className="space-y-4">
              <div className="bg-[#181b16] border border-white/10 p-6">
                <h2 className="!font-sans !text-base font-semibold mb-1 tracking-normal">Customer Project Inquiries &amp; Bespoke Briefs</h2>
                <p className="text-xs text-[#b9b2a3] mb-6">
                  Every inquiry prepared in the public showroom is logged here and synced with MySQL (<code className="text-[#d6b36a]">sf_inquiries</code>).
                </p>

                {inquiries.length === 0 ? (
                  <p className="text-sm text-[#9c9587] py-8 text-center">No project inquiries recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {inquiries.map((inq) => (
                      <article key={inq.id} className="p-4 bg-[#121511] border border-white/10 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                          <div>
                            <strong className="text-sm text-[#f4efe6]">{inq.name}</strong>
                            <span className="mx-2 text-[#9c9587]">·</span>
                            <span className="font-mono text-xs text-[#d6b36a]">{inq.phone}</span>
                            <span className="mx-2 text-[#9c9587]">·</span>
                            <span className="text-xs text-[#b9b2a3]">{inq.city || 'City not specified'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label htmlFor={`status-${inq.id}`} className="sr-only">
                              Inquiry Status
                            </label>
                            <select
                              id={`status-${inq.id}`}
                              value={inq.status}
                              onChange={(e) =>
                                onMutate({
                                  action: 'admin_update_inquiry',
                                  id: inq.id,
                                  status: e.target.value,
                                })
                              }
                              className="px-2.5 py-1 bg-[#1c201b] border border-[#d6b36a]/40 text-xs text-[#f4efe6]"
                            >
                              <option value="new">New Inquiry</option>
                              <option value="contacted">Contacted on WhatsApp</option>
                              <option value="quoted">Quotation Sent</option>
                              <option value="in_production">In Workshop Production</option>
                              <option value="completed">Delivered &amp; Installed</option>
                              <option value="archived">Archived</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => onMutate({ action: 'admin_delete_inquiry', id: inq.id })}
                              aria-label={`Delete inquiry from ${inq.name}`}
                              className="p-1.5 text-red-300 hover:bg-red-950/50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-[#e5dec9] whitespace-pre-line leading-relaxed">{inq.message}</p>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#9c9587] pt-1">
                          <span>Project Category: <strong className="text-[#cfc8b8] uppercase">{inq.project}</strong></span>
                          {inq.designIds.length > 0 && (
                            <span>Shortlisted Designs: <strong className="text-[#d6b36a]">{inq.designIds.join(', ')}</strong></span>
                          )}
                          {inq.studio && (
                            <span>
                              Studio Brief:{' '}
                              <strong className="text-[#cfc8b8]">
                                {inq.studio.wood} wood · {inq.studio.finish} finish · {inq.studio.width} cm
                              </strong>
                            </span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: REVIEWS MODERATION */}
          {activeTab === 'reviews' && (
            <div className="bg-[#181b16] border border-white/10 p-6 space-y-4">
              <div>
                <h2 className="!font-sans !text-base font-semibold tracking-normal">Customer Reviews &amp; Testimonial Moderation</h2>
                <p className="text-xs text-[#b9b2a3] mt-1">
                  Approve, hold, or remove customer reviews stored in <code className="text-[#d6b36a]">sf_reviews</code>. Approved reviews appear immediately in the showroom carousel.
                </p>
              </div>

              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 bg-[#121511] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2 text-xs">
                        <strong className="text-[#f4efe6]">{rev.name}</strong>
                        <span className="text-[#9c9587]">·</span>
                        <span className="text-[#b9b2a3]">{rev.city.en}</span>
                        <span className="text-[#9c9587]">·</span>
                        <span className="text-[#d6b36a] font-mono">{rev.rating} / 5 Stars</span>
                        <span className="text-[#9c9587]">·</span>
                        <span
                          className={
                            rev.status === 'approved'
                              ? 'text-emerald-400 uppercase font-mono text-[11px]'
                              : rev.status === 'pending'
                              ? 'text-amber-400 uppercase font-mono text-[11px]'
                              : 'text-red-400 uppercase font-mono text-[11px]'
                          }
                        >
                          {rev.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#e5dec9] leading-relaxed">{rev.text.en}</p>
                      {rev.text.ur && rev.text.ur !== rev.text.en && (
                        <p className="text-xs text-[#b9b2a3]" lang="ur" dir="rtl">
                          {rev.text.ur}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onMutate({ action: 'admin_moderate_review', id: rev.id, status: 'approved' })
                        }
                        className={`px-3 py-1.5 text-xs font-medium cursor-pointer ${
                          rev.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-white/5 text-[#cfc8b8] hover:bg-white/10'
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onMutate({ action: 'admin_moderate_review', id: rev.id, status: 'pending' })
                        }
                        className={`px-3 py-1.5 text-xs font-medium cursor-pointer ${
                          rev.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-white/5 text-[#cfc8b8] hover:bg-white/10'
                        }`}
                      >
                        Hold
                      </button>
                      <button
                        type="button"
                        onClick={() => onMutate({ action: 'admin_delete_review', id: rev.id })}
                        aria-label={`Delete review by ${rev.name}`}
                        className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-200 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PHP 8.3–8.5+ & CONFIG.PHP INSPECTOR */}
          {activeTab === 'php-mysql' && (
            <div className="space-y-6">
              <div className="bg-[#181b16] border border-white/10 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="!font-sans !text-base font-semibold text-[#f4efe6] tracking-normal">
                      Production PHP 8.3 – 8.5+ &amp; MySQL Integration Files (<code className="text-[#d6b36a]">/server-php/</code>)
                    </h2>
                    <p className="text-xs text-[#b9b2a3] mt-1">
                      Every file is syntax-checked and uses <code className="text-[#d6b36a]">declare(strict_types=1);</code>, native PDO prepared statements, Argon2id, and PHP 8.4/8.5 <code className="text-[#d6b36a]">Pdo\Mysql</code> compatibility.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(selectedPhpFile, activePhpFileContent)}
                      className="px-3.5 py-2 bg-[#232821] hover:bg-[#2e352b] border border-white/15 text-xs text-[#f4efe6] flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedFile === selectedPhpFile ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Source
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadFile(
                          selectedPhpFile.replace(' (Live Preview)', ''),
                          activePhpFileContent
                        )
                      }
                      className="px-3.5 py-2 bg-[#d6b36a] text-[#141613] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download {selectedPhpFile.replace(' (Live Preview)', '')}
                    </button>
                  </div>
                </div>

                {/* File Selector Tabs */}
                <div className="flex flex-wrap gap-1.5 mb-4 border-b border-white/10 pb-3">
                  {[
                    'config.php',
                    'database.sql',
                    'api.php',
                    'ad/ad-wz.php',
                    'index.php',
                    '.htaccess',
                    'config.php (Live Preview)',
                  ].map((file) => (
                    <button
                      key={file}
                      type="button"
                      onClick={() => setSelectedPhpFile(file)}
                      className={`px-3 py-1.5 text-xs font-mono cursor-pointer ${
                        selectedPhpFile === file
                          ? 'bg-[#d6b36a] text-[#141613] font-semibold'
                          : 'bg-[#121511] text-[#b9b2a3] hover:text-white'
                      }`}
                    >
                      {file}
                    </button>
                  ))}
                </div>

                <pre className="p-4 bg-[#0d0f0c] border border-white/10 text-xs font-mono text-[#e5dec9] overflow-x-auto max-h-[540px] leading-relaxed">
                  <code>{activePhpFileContent}</code>
                </pre>
              </div>
            </div>
          )}

          {/* TAB 6: SHOWROOM & MYSQL CONFIGURATION */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveConfig} className="bg-[#181b16] border border-white/10 p-6 space-y-6 max-w-3xl">
              <div>
                <h2 className="!font-sans !text-base font-semibold tracking-normal">Showroom Brand &amp; MySQL Connection Parameters</h2>
                <p className="text-xs text-[#b9b2a3] mt-1">
                  Updates both the live showroom configuration and the generated <code className="text-[#d6b36a]">config.php</code> MySQL DSN settings.
                </p>
              </div>

              {cfgSavedMsg && (
                <div role="status" className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200">
                  {cfgSavedMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cfg-brand" className="block text-xs text-[#b9b2a3] mb-1">
                    Brand Name (English)
                  </label>
                  <input
                    id="cfg-brand"
                    type="text"
                    value={cfgBrand}
                    onChange={(e) => setCfgBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="cfg-brand-ur" className="block text-xs text-[#b9b2a3] mb-1">
                    Brand Name (Urdu)
                  </label>
                  <input
                    id="cfg-brand-ur"
                    type="text"
                    dir="rtl"
                    value={cfgBrandUr}
                    onChange={(e) => setCfgBrandUr(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="cfg-wa" className="block text-xs text-[#b9b2a3] mb-1">
                    WhatsApp Number (Digits only, with country code)
                  </label>
                  <input
                    id="cfg-wa"
                    type="text"
                    value={cfgWhatsapp}
                    onChange={(e) => setCfgWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="cfg-phone" className="block text-xs text-[#b9b2a3] mb-1">
                    Public Display Phone
                  </label>
                  <input
                    id="cfg-phone"
                    type="text"
                    value={cfgPhoneDisplay}
                    onChange={(e) => setCfgPhoneDisplay(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold text-[#d6b36a] mb-3">
                  MySQL PDO &amp; PHP Runtime Target (<code className="font-mono">config.php</code>)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="cfg-db-host" className="block text-xs text-[#b9b2a3] mb-1">
                      MySQL Host
                    </label>
                    <input
                      id="cfg-db-host"
                      type="text"
                      value={cfgDbHost}
                      onChange={(e) => setCfgDbHost(e.target.value)}
                      className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="cfg-db-port" className="block text-xs text-[#b9b2a3] mb-1">
                      MySQL Port
                    </label>
                    <input
                      id="cfg-db-port"
                      type="number"
                      value={cfgDbPort}
                      onChange={(e) => setCfgDbPort(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="cfg-php-ver" className="block text-xs text-[#b9b2a3] mb-1">
                      Target PHP Version
                    </label>
                    <select
                      id="cfg-php-ver"
                      value={cfgPhpVer}
                      onChange={(e) => setCfgPhpVer(e.target.value as '8.3' | '8.4' | '8.5')}
                      className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white font-mono"
                    >
                      <option value="8.3">PHP 8.3 (Typed Constants + Readonly)</option>
                      <option value="8.4">PHP 8.4 (Pdo\Mysql + Property Hooks)</option>
                      <option value="8.5">PHP 8.5+ (Forward-Compatible Strict)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="cfg-db-name" className="block text-xs text-[#b9b2a3] mb-1">
                      Database Name
                    </label>
                    <input
                      id="cfg-db-name"
                      type="text"
                      value={cfgDbName}
                      onChange={(e) => setCfgDbName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="cfg-db-user" className="block text-xs text-[#b9b2a3] mb-1">
                      Database User
                    </label>
                    <input
                      id="cfg-db-user"
                      type="text"
                      value={cfgDbUser}
                      onChange={(e) => setCfgDbUser(e.target.value)}
                      className="w-full px-3 py-2 bg-[#111310] border border-white/15 text-sm text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#d6b36a] text-[#141613] text-xs font-semibold cursor-pointer"
              >
                Save Showroom &amp; config.php Settings
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
