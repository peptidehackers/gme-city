"use client";
import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";

// Drop this file into app/page.tsx in a Next.js 14 project
// TailwindCSS recommended: https://tailwindcss.com/docs/guides/nextjs
// Single-page MVP with three tools:
// 1) Instant GBP Audit
// 2) LocalBusiness Schema Generator
// 3) Data API Dashboard (PageSpeed, Local Pack, Yelp)

// ---------------------- Types ----------------------
type AuditInput = {
  businessName: string;
  city: string;
  primaryCategory: string;
  reviewCount: number;
  rating: number; // 1..5
  photosLast30d: number;
  hasQA: boolean;
  postsPerMonth: number;
  hasWebsite: boolean;
  hasHours: boolean;
  hasServices: boolean;
  hasBookingLink: boolean;
  hasDuplicateListing: boolean; // bad
  napConsistent: boolean;
};

// ---------------------- Global switches ----------------------
export const API_ENABLED = true; // set to true when API keys are configured

// ---------------------- Styling tokens ----------------------
// layout tokens
const CONTAINER = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";
const SECTION_Y = "py-16 md:py-24";
const GRID_GAP = "gap-8 md:gap-12";

// surface tokens
const CARD = "rounded-2xl border border-white/10 bg-white/5 p-8 md:p-10 shadow-xl shadow-black/20 backdrop-blur-sm";

// control tokens
const INPUT = "h-11 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400";
const BTN = "h-11 px-4 rounded-xl font-semibold";
const BTN_PRIMARY = `${BTN} bg-emerald-400 text-black hover:bg-emerald-500 transition`;
const BTN_GHOST = `${BTN} border border-white/20 hover:bg-white/10 transition`;

// progress bar
const PROGRESS_BG = "h-2 w-full rounded-full bg-white/10";
const PROGRESS_FG = "h-2 rounded-full bg-emerald-400";

// ---------------------- CSS Animations ----------------------
const neonAnimationStyles = `
  @keyframes border-trail {
    0% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: -4000;
    }
  }

  .neon-loading-border {
    position: relative;
  }

  .neon-loading-border svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .neon-loading-border .border-trail-stroke {
    fill: none;
    stroke: url(#emeraldGradient);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 300 3700;
    animation: border-trail 3s linear infinite;
  }

  .neon-loading-border .border-glow-stroke {
    fill: none;
    stroke: url(#emeraldGlowGradient);
    stroke-width: 6;
    stroke-linecap: round;
    stroke-dasharray: 300 3700;
    animation: border-trail 3s linear infinite;
    filter: blur(10px);
    opacity: 0.7;
  }
`;

// ---------------------- Helpers ----------------------
function notifyError(source: string, err: unknown) {
  console.error(source, err);
  if (typeof window !== "undefined") alert(`${source} failed. Check API keys and try again.`);
}

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

export function computeScore(a: AuditInput) {
  let score = 0;
  const breakdown: Record<string, number> = {};

  const baseCompleteness =
    (a.hasWebsite ? 10 : 0) +
    (a.hasHours ? 10 : 0) +
    (a.hasServices ? 10 : 0) +
    (a.hasBookingLink ? 8 : 0) +
    (a.hasQA ? 7 : 0) +
    (a.napConsistent ? 15 : 0) +
    (!a.hasDuplicateListing ? 15 : 0);
  breakdown["Profile completeness"] = baseCompleteness;

  const reviewQty = clamp(Math.log10(Math.max(1, a.reviewCount)) * 12, 0, 24);
  const reviewQuality = clamp(((a.rating - 3.5) / 1.5) * 20, 0, 20);
  breakdown["Reviews"] = reviewQty + reviewQuality;

  const photosFreshness = clamp(a.photosLast30d * 2, 0, 14);
  breakdown["Photos freshness"] = photosFreshness;

  const posts = clamp(a.postsPerMonth * 2.5, 0, 15);
  breakdown["Posts cadence"] = posts;

  score = Object.values(breakdown).reduce((s, n) => s + n, 0);
  score = clamp(Math.round(score));
  return { score, breakdown };
}

export function taskList(a: AuditInput) {
  const tasks: { title: string; why: string; impact: "High" | "Medium" | "Low" }[] = [];
  if (!a.napConsistent)
    tasks.push({ title: "Fix NAP consistency across top citations", why: "Mismatched name, address, or phone drags down trust and rankings", impact: "High" });
  if (a.hasDuplicateListing)
    tasks.push({ title: "Remove or merge duplicate Google listings", why: "Dupes split reviews and confuse Maps, killing visibility", impact: "High" });
  if (a.reviewCount < 100)
    tasks.push({ title: "Run a compliant review campaign until you hit 100+", why: "Volume plus velocity beats similar competitors in dense markets", impact: "High" });
  if (a.rating < 4.6)
    tasks.push({ title: "Lift average rating to 4.6+", why: "Map pack winners almost always sit above 4.6", impact: "High" });
  if (a.photosLast30d < 8)
    tasks.push({ title: "Upload 8 to 12 fresh geo-tagged photos this month", why: "Fresh media is a relevance signal and raises CTR", impact: "Medium" });
  if (a.postsPerMonth < 4)
    tasks.push({ title: "Publish weekly Google Posts", why: "Consistent offers and FAQs increase conversions and keep the profile active", impact: "Medium" });
  if (!a.hasServices)
    tasks.push({ title: "Fill Services with keyword rich but natural language", why: "Services ties search terms to your profile and improves topical coverage", impact: "Medium" });
  if (!a.hasQA)
    tasks.push({ title: "Seed and answer five Q and A items", why: "You control the narrative and preempt objections", impact: "Low" });
  if (!a.hasBookingLink)
    tasks.push({ title: "Add booking or lead link", why: "Shortens the path from discovery to contact", impact: "Low" });
  return tasks;
}

export function buildLocalBusinessJsonLd(input: {
  name: string;
  url: string;
  phone: string;
  street1: string;
  street2?: string;
  city: string;
  region: string;
  postal: string;
  country: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: input.name,
    url: input.url,
    telephone: input.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: [input.street1, input.street2].filter(Boolean).join(", "),
      addressLocality: input.city,
      addressRegion: input.region,
      postalCode: input.postal,
      addressCountry: input.country,
    },
  } as const;
  return JSON.stringify(data, null, 2);
}

// Animated number for hero score
function useAnimatedNumber(value: number, duration = 600) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (to - from) * eased);
      setDisplay(val);
      if (t < 1) requestAnimationFrame(step);
      else prevRef.current = value;
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return display;
}

function parseNumberInput(raw: string, min = 0, max?: number) {
  const n = parseFloat(raw);
  let v = isNaN(n) ? min : n;
  if (min !== undefined) v = Math.max(min, v);
  if (typeof max === "number") v = Math.min(max, v);
  return v;
}

function parseRatingInput(raw: string) {
  return parseNumberInput(raw, 1, 5);
}

// ---------------------- Feature Components ----------------------

// SEO Snapshot Score Section Wrapper (with neon loading effect on card)
function SEOSnapshotSection() {
  const [loading, setLoading] = useState(false);

  return (
    <section className={`${CONTAINER} ${SECTION_Y}`}>
      <style dangerouslySetInnerHTML={{ __html: neonAnimationStyles }} />
      <div className="prelogin-module">
        <div className={`${CARD} ${loading ? 'neon-loading-border' : ''}`}>
          {loading && (
            <svg xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <defs>
                <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#6ee7b7" />
                </linearGradient>
                <linearGradient id="emeraldGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(16, 185, 129, 0.6)" />
                  <stop offset="50%" stopColor="rgba(52, 211, 153, 0.8)" />
                  <stop offset="100%" stopColor="rgba(110, 231, 183, 0.6)" />
                </linearGradient>
              </defs>
              <rect className="border-glow-stroke" x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="16" />
              <rect className="border-trail-stroke" x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="16" />
            </svg>
          )}
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Get Your Complete SEO Snapshot</h2>
            <p className="mt-3 text-white/70 max-w-2xl mx-auto">See your Local SEO and Onsite SEO scores with detailed issue breakdown</p>
          </div>
          <SEOSnapshotScore onLoadingChange={setLoading} />
        </div>
      </div>
    </section>
  );
}

// SEO Snapshot Score Component (2-step form)
function SEOSnapshotScore({ onLoadingChange }: { onLoadingChange: (loading: boolean) => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: "",
    websiteUrl: "",
    category: "",
    street: "",
    city: "",
    zip: "",
    phone: "",
    gbpUrl: "",
    email: "",
    consent: false
  });
  const [results, setResults] = useState<{
    localScore: number;
    onsiteScore: number;
    localInsights: string[];
    onsiteInsights: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper: Format phone number as 123-456-7890
  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join('-');
    }
    return value;
  };

  // Helper: Add https:// prefix if missing
  const normalizeUrl = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onLoadingChange(true);

    try {
      const response = await fetch('/api/seo-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: formData.businessName,
          website: formData.websiteUrl,
          address: formData.street,
          city: formData.city,
          zip: formData.zip,
          phone: formData.phone,
          category: formData.category,
          gbp_url: formData.gbpUrl,
          email: formData.email
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate SEO score');
      }

      const data = await response.json();
      setResults({
        localScore: data.local.score,
        onsiteScore: data.onsite.score,
        localInsights: data.local.insights,
        onsiteInsights: data.onsite.insights
      });
    } catch (error) {
      console.error('Error fetching SEO score:', error);
      // Fallback to mock data if API fails
      setResults({
        localScore: 50,
        onsiteScore: 50,
        localInsights: ['Unable to analyze website. Please try again later.'],
        onsiteInsights: []
      });
    } finally {
      setLoading(false);
      onLoadingChange(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {!results ? (
        <form onSubmit={step === 1 ? handleNext : handleSubmit}>
          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                className={INPUT}
                placeholder="Business Name"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
              />
              <input
                className={INPUT}
                placeholder="Website URL (e.g., example.com)"
                type="text"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                onBlur={(e) => setFormData({ ...formData, websiteUrl: normalizeUrl(e.target.value) })}
                required
              />
              <input
                className={INPUT}
                placeholder="Business Category / Services"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
              <input
                className={INPUT}
                placeholder="Street Address"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                required
              />
              <input
                className={INPUT}
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
              <input
                className={INPUT}
                placeholder="ZIP Code"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                required
              />
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className={BTN_PRIMARY}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                className={INPUT}
                placeholder="Phone Number (123-456-7890)"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                maxLength={12}
              />
              <input
                className={INPUT}
                placeholder="Google Business Profile URL (optional)"
                type="text"
                value={formData.gbpUrl}
                onChange={(e) => setFormData({ ...formData, gbpUrl: e.target.value })}
                onBlur={(e) => setFormData({ ...formData, gbpUrl: normalizeUrl(e.target.value) })}
              />
              <input
                className={`${INPUT} sm:col-span-2`}
                placeholder="Email (optional, for results delivery)"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <label className="sm:col-span-2 flex items-start gap-3 text-sm text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                  required
                />
                <span>I consent to having my website scanned and evaluated</span>
              </label>
              <div className="sm:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setStep(1)} className={BTN_GHOST}>
                  ← Back
                </button>
                <button type="submit" className={BTN_PRIMARY} disabled={loading}>
                  {loading ? "Generating..." : "Generate My SEO Snapshot"}
                </button>
              </div>
            </div>
          )}
        </form>
      ) : (
        <div>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-sm text-white/60 mb-2">Local SEO</div>
              <div className="text-6xl font-black bg-gradient-to-br from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                {results.localScore}
              </div>
              <div className="text-white/60 mt-1">/ 100</div>
              <div className={`mt-4 ${PROGRESS_BG}`}>
                <div className={PROGRESS_FG} style={{ width: `${results.localScore}%` }} />
              </div>
            </div>
            <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-sm text-white/60 mb-2">Onsite SEO</div>
              <div className="text-6xl font-black bg-gradient-to-br from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                {results.onsiteScore}
              </div>
              <div className="text-white/60 mt-1">/ 100</div>
              <div className={`mt-4 ${PROGRESS_BG}`}>
                <div className={PROGRESS_FG} style={{ width: `${results.onsiteScore}%` }} />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Local SEO Issues:</h3>
              <div className="space-y-2">
                {results.localInsights.length > 0 ? (
                  results.localInsights.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-white/90">{issue}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-white/90">
                    No major local SEO issues detected
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Onsite SEO Issues:</h3>
              <div className="space-y-2">
                {results.onsiteInsights.length > 0 ? (
                  results.onsiteInsights.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-white/90">{issue}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-white/90">
                    No major onsite SEO issues detected
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-center">
            <button className={BTN_PRIMARY}>View Full Audit Report</button>
            <button onClick={() => { setResults(null); setStep(1); }} className={`${BTN_GHOST} ml-3`}>
              Run Another Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Citation Coverage Check Component (GBP Focus)
function CitationCoverageCheck() {
  const [formData, setFormData] = useState({
    businessName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    category: ""
  });
  const [results, setResults] = useState<{
    hasGBP: boolean;
    gbpData?: { name: string; rating: number; reviewCount: number; address?: string; phone?: string };
    insights: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper: Format phone number as 123-456-7890
  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join('-');
    }
    return value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/citation-coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: formData.businessName,
          address: formData.address || undefined,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          phone: formData.phone || undefined,
          category: formData.category || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check GBP');
      }

      const data = await response.json();
      setResults({
        hasGBP: data.hasGBP,
        gbpData: data.gbpData,
        insights: data.insights || []
      });
    } catch (error) {
      console.error('GBP check error:', error);
      setResults({
        hasGBP: false,
        insights: ['Unable to verify Google Business Profile. Please try again.']
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4 mb-8">
        <input
          className={INPUT}
          placeholder="Business Name *"
          value={formData.businessName}
          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
          required
        />
        <input
          className={INPUT}
          placeholder="Street Address (optional)"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
        <input
          className={INPUT}
          placeholder="City *"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          required
        />
        <input
          className={INPUT}
          placeholder="State * (e.g., CA)"
          value={formData.state}
          onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
          maxLength={2}
          required
        />
        <input
          className={INPUT}
          placeholder="ZIP Code *"
          value={formData.zip}
          onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
          required
        />
        <input
          className={INPUT}
          placeholder="Phone Number (optional)"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
          maxLength={12}
        />
        <input
          className={`${INPUT} sm:col-span-2`}
          placeholder="Business Category (optional, e.g., 'dentist', 'plumber', 'restaurant')"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        />
        <button type="submit" className={`${BTN_PRIMARY} sm:col-span-2`} disabled={loading}>
          {loading ? "Checking..." : "Check My Google Business Profile"}
        </button>
      </form>

      {results && (
        <div>
          {/* GBP Status Card */}
          <div className={`p-6 rounded-xl border mb-6 ${
            results.hasGBP
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}>
            <div className="flex items-start gap-4">
              {results.hasGBP ? (
                <svg className="w-12 h-12 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">
                  {results.hasGBP ? "Google Business Profile Found!" : "No Google Business Profile Found"}
                </h3>
                {results.gbpData && (
                  <div className="text-white/80 mb-3">
                    <p className="font-medium">{results.gbpData.name}</p>
                    <p>⭐ {results.gbpData.rating}/5.0 ({results.gbpData.reviewCount} reviews)</p>
                    {results.gbpData.address && <p className="text-sm">📍 {results.gbpData.address}</p>}
                    {results.gbpData.phone && <p className="text-sm">📞 {results.gbpData.phone}</p>}
                  </div>
                )}
                <ul className="space-y-2 text-white/70">
                  {results.insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Full Citation Audit CTA */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <h3 className="text-2xl font-bold mb-3">Want a Complete Citation Audit?</h3>
            <p className="text-white/70 mb-6 max-w-xl mx-auto">
              Get a comprehensive review of your business listings across 40+ top directories including
              Yelp, Apple Maps, Facebook, Bing Places, and more.
            </p>
            <a
              href="https://calendly.com/your-link"
              target="_blank"
              rel="noopener noreferrer"
              className={BTN_PRIMARY}
            >
              Schedule Free Citation Audit
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// Keyword Opportunity Scanner Component
function KeywordOpportunityScanner() {
  const [formData, setFormData] = useState({ websiteUrl: "", category: "", city: "", competitorUrl: "" });
  const [results, setResults] = useState<{ keyword: string; volume: number; ranking?: number }[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper: Add https:// prefix if missing
  const normalizeUrl = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Replace with actual API call to /api/keywords
    setTimeout(() => {
      const category = formData.category || "plumber";
      const city = formData.city || "Encino";

      const mockKeywords = [
        { keyword: `emergency ${category} ${city.toLowerCase()}`, volume: 140, ranking: 8 },
        { keyword: `${category} near me`, volume: 320, ranking: undefined },
        { keyword: `best ${category} ${city.toLowerCase()}`, volume: 180, ranking: undefined },
        { keyword: `${category} ${city.toLowerCase()} reviews`, volume: 90, ranking: undefined },
        { keyword: `24/7 ${category} ${city.toLowerCase()}`, volume: 110, ranking: undefined },
      ];

      setResults(mockKeywords);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4 mb-8">
        <input
          className={`${INPUT} sm:col-span-2`}
          placeholder="Website URL (e.g., example.com)"
          type="text"
          value={formData.websiteUrl}
          onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
          onBlur={(e) => setFormData({ ...formData, websiteUrl: normalizeUrl(e.target.value) })}
          required
        />
        <input
          className={INPUT}
          placeholder="Business Category / Services"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          required
        />
        <input
          className={INPUT}
          placeholder="City or Location (optional)"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
        />
        <input
          className={`${INPUT} sm:col-span-2`}
          placeholder="Competitor Website URL (optional)"
          type="text"
          value={formData.competitorUrl}
          onChange={(e) => setFormData({ ...formData, competitorUrl: e.target.value })}
          onBlur={(e) => setFormData({ ...formData, competitorUrl: normalizeUrl(e.target.value) })}
        />
        <button type="submit" className={`${BTN_PRIMARY} sm:col-span-2`} disabled={loading}>
          {loading ? "Finding keywords..." : "Find My Keywords"}
        </button>
      </form>

      {results && (
        <div>
          <div className="space-y-3 mb-8">
            {results.map((kw, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="font-medium text-white">{kw.keyword}</div>
                  {kw.ranking && (
                    <div className="mt-1 text-sm text-yellow-400">
                      You're currently ranking #{kw.ranking} for this keyword
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-emerald-400">{kw.volume}</div>
                  <div className="text-xs text-white/60">searches/mo</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button className={BTN_PRIMARY}>Get Full Keyword Plan</button>
            <p className="mt-3 text-sm text-white/60">
              Unlock personalized keyword strategies + ranking tracker
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------- UI ----------------------
export default function GMECityLanding() {
  const auditRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<"audit" | "schema" | "data" | "compare" | "citations">("audit");

  // Audit state
  const [audit, setAudit] = useState<AuditInput>({
    businessName: "",
    city: "Los Angeles",
    primaryCategory: "Personal injury attorney",
    reviewCount: 18,
    rating: 4.3,
    photosLast30d: 2,
    hasQA: false,
    postsPerMonth: 1,
    hasWebsite: true,
    hasHours: true,
    hasServices: false,
    hasBookingLink: false,
    hasDuplicateListing: false,
    napConsistent: true,
  });
  const { score, breakdown } = computeScore(audit);
  const animatedScore = useAnimatedNumber(score);
  const tasks = taskList(audit);

  // Schema state
  const [schemaForm, setSchemaForm] = useState({
    name: "GME City",
    url: "https://gme.city",
    phone: "+1 310 555 1212",
    street1: "123 Example Blvd",
    street2: "Suite 200",
    city: "Los Angeles",
    region: "CA",
    postal: "90012",
    country: "US",
  });
  const schemaJson = buildLocalBusinessJsonLd(schemaForm);

  const [printMsg, setPrintMsg] = useState("");
  const doPrint = () => {
    setPrintMsg("Opening print dialog...");
    setTimeout(() => setPrintMsg(""), 2000);
    window.print();
  };

  // Export/Share state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const [showWhiteLabelModal, setShowWhiteLabelModal] = useState(false);
  const [whiteLabelConfig, setWhiteLabelConfig] = useState({
    brandName: "GME City",
    brandColor: "#10b981",
    logoUrl: "",
  });

  const sendEmailReport = async () => {
    if (!emailTo.trim()) {
      alert("Please enter an email address");
      return;
    }
    setEmailSending(true);
    try {
      const reportData = {
        audit,
        score,
        breakdown,
        tasks,
        emailTo,
        whiteLabelConfig,
      };
      // In production, send to your backend API
      const r = await fetch("/api/email-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      alert(`Report sent to ${emailTo}`);
      setShowEmailModal(false);
      setEmailTo("");
    } catch (e) {
      notifyError("Email report", e);
    } finally {
      setEmailSending(false);
    }
  };

  const generateShareableLink = () => {
    // Encode audit data in URL params
    const encoded = btoa(JSON.stringify({ audit, whiteLabelConfig }));
    const link = `${window.location.origin}${window.location.pathname}?shared=${encoded}`;
    setShareableLink(link);
    setShowShareModal(true);
  };

  const copyShareableLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      alert("Link copied to clipboard!");
    } catch (e) {
      notifyError("Copy link", e);
    }
  };

  // Supabase: Save audit to database
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  const saveAuditToDatabase = async (email?: string) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('audits')
        .insert({
          business_name: audit.businessName,
          city: audit.city,
          primary_category: audit.primaryCategory,
          review_count: audit.reviewCount,
          rating: audit.rating,
          photos_last_30d: audit.photosLast30d,
          has_qa: audit.hasQA,
          posts_per_month: audit.postsPerMonth,
          has_website: audit.hasWebsite,
          has_hours: audit.hasHours,
          has_services: audit.hasServices,
          has_booking_link: audit.hasBookingLink,
          has_duplicate_listing: audit.hasDuplicateListing,
          nap_consistent: audit.napConsistent,
          score,
          breakdown,
          tasks,
          user_email: email || userEmail || null,
        })
        .select()
        .single();

      if (error) throw error;

      setSavedAuditId(data.id);
      alert(`✅ Audit saved! ID: ${data.id.substring(0, 8)}...`);
      setShowSaveModal(false);
    } catch (e: any) {
      console.error("Save audit error:", e);
      alert(`Failed to save audit: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const [mobileOpen, setMobileOpen] = useState(false);

  // Data tab state
  const [psiUrl, setPsiUrl] = useState("https://gme.city");
  const [psi, setPsi] = useState<any>(null);
  const [psiLoading, setPsiLoading] = useState(false);
  const runPSI = async () => {
    if (!API_ENABLED) return;
    setPsiLoading(true);
    try {
      const r = await fetch(`/api/pagespeed?url=${encodeURIComponent(psiUrl)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setPsi(j);
    } catch (e) {
      notifyError("PageSpeed Insights", e);
    } finally {
      setPsiLoading(false);
    }
  };

  const [lpQuery, setLpQuery] = useState("personal injury lawyer");
  const [lpLocation, setLpLocation] = useState("Los Angeles, California, United States");
  const [lp, setLp] = useState<any[]>([]);
  const [lpLoading, setLpLoading] = useState(false);
  const runLocalPack = async () => {
    if (!API_ENABLED) return;
    setLpLoading(true);
    try {
      const r = await fetch(`/api/localpack?q=${encodeURIComponent(lpQuery)}&location=${encodeURIComponent(lpLocation)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setLp(j.local_results || []);
    } catch (e) {
      notifyError("Local Pack", e);
    } finally {
      setLpLoading(false);
    }
  };

  const [yTerm, setYTerm] = useState("personal injury attorney");
  const [yLoc, setYLoc] = useState("Los Angeles, CA");
  const [yelp, setYelp] = useState<any[]>([]);
  const [yLoading, setYLoading] = useState(false);
  const runYelp = async () => {
    if (!API_ENABLED) return;
    setYLoading(true);
    try {
      const r = await fetch(`/api/yelp/search?term=${encodeURIComponent(yTerm)}&location=${encodeURIComponent(yLoc)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setYelp(j.businesses || []);
    } catch (e) {
      notifyError("Yelp", e);
    } finally {
      setYLoading(false);
    }
  };

  // Citation Builder state
  type DirectoryStatus = "ready" | "submitted" | "pending" | "done";
  type Directory = {
    name: string;
    category: string;
    status: DirectoryStatus;
    url?: string;
    hasPrefilledLink: boolean;
    importance: "high" | "medium" | "low";
  };

  const [citationNAP, setCitationNAP] = useState({
    businessName: "",
    street: "",
    suite: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    website: "",
    category: "",
    hours: "",
    description: "",
  });

  const [directories, setDirectories] = useState<Directory[]>([
    { name: "Google Business Profile", category: "Search Engines", status: "done", url: "https://business.google.com", hasPrefilledLink: true, importance: "high" },
    { name: "Apple Maps", category: "Search Engines", status: "pending", hasPrefilledLink: true, importance: "high" },
    { name: "Yelp", category: "Reviews", status: "ready", hasPrefilledLink: true, importance: "high" },
    { name: "Bing Places", category: "Search Engines", status: "ready", hasPrefilledLink: true, importance: "high" },
    { name: "Facebook Business", category: "Social", status: "submitted", hasPrefilledLink: true, importance: "high" },
    { name: "Yellow Pages", category: "Directories", status: "ready", hasPrefilledLink: true, importance: "medium" },
    { name: "BBB", category: "Trust", status: "ready", hasPrefilledLink: false, importance: "medium" },
    { name: "Foursquare", category: "Directories", status: "ready", hasPrefilledLink: true, importance: "medium" },
    { name: "Mapquest", category: "Search Engines", status: "ready", hasPrefilledLink: true, importance: "medium" },
    { name: "Nextdoor", category: "Social", status: "ready", hasPrefilledLink: false, importance: "medium" },
    { name: "Angi", category: "Reviews", status: "ready", hasPrefilledLink: true, importance: "low" },
    { name: "Thumbtack", category: "Reviews", status: "ready", hasPrefilledLink: true, importance: "low" },
  ]);

  const [selectedPlan, setSelectedPlan] = useState<"done-for-you" | "do-it-with-you" | null>(null);

  const citationStats = {
    total: directories.length,
    completed: directories.filter(d => d.status === "done").length,
    pending: directories.filter(d => d.status === "pending").length,
    consistency: Math.round((directories.filter(d => d.status === "done").length / directories.length) * 100),
  };

  const updateDirectoryStatus = (directoryName: string, newStatus: DirectoryStatus) => {
    setDirectories(dirs => dirs.map(d =>
      d.name === directoryName ? { ...d, status: newStatus } : d
    ));
  };

  // Automated Monitoring state
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);
  const [monitoringEmail, setMonitoringEmail] = useState("");
  const [monitoringSettings, setMonitoringSettings] = useState({
    weeklyReport: true,
    reviewAlerts: true,
    reviewThreshold: 4.5,
    competitorAlerts: true,
    rankingAlerts: true,
  });
  const [hasActiveMonitoring, setHasActiveMonitoring] = useState(false);

  // GMB Integration state
  const [showGMBModal, setShowGMBModal] = useState(false);
  const [gmbAccountId, setGmbAccountId] = useState("");
  const [gmbLocationId, setGmbLocationId] = useState("");
  const [gmbAccessToken, setGmbAccessToken] = useState("");
  const [gmbLoading, setGmbLoading] = useState(false);

  const fetchGMBData = async () => {
    if (!gmbAccountId || !gmbLocationId || !gmbAccessToken) {
      alert("Please provide Account ID, Location ID, and Access Token");
      return;
    }

    setGmbLoading(true);
    try {
      const response = await fetch(
        `/api/gmb/profile?accountId=${encodeURIComponent(gmbAccountId)}&locationId=${encodeURIComponent(gmbLocationId)}`,
        {
          headers: {
            Authorization: `Bearer ${gmbAccessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch GMB data");
      }

      const result = await response.json();

      // Auto-populate audit form with real GMB data
      setAudit({
        businessName: result.data.businessName,
        city: result.data.city,
        primaryCategory: result.data.primaryCategory,
        reviewCount: result.data.reviewCount,
        rating: result.data.rating,
        photosLast30d: result.data.photosLast30d,
        hasQA: result.data.hasQA,
        postsPerMonth: result.data.postsPerMonth,
        hasWebsite: result.data.hasWebsite,
        hasHours: result.data.hasHours,
        hasServices: result.data.hasServices,
        hasBookingLink: result.data.hasBookingLink,
        hasDuplicateListing: result.data.hasDuplicateListing,
        napConsistent: result.data.napConsistent,
      });

      alert("✅ GMB data imported successfully!");
      setShowGMBModal(false);
    } catch (e: any) {
      console.error("GMB fetch error:", e);
      alert(`Failed to fetch GMB data: ${e.message}`);
    } finally {
      setGmbLoading(false);
    }
  };

  // Zapier Integration state
  const [showZapierModal, setShowZapierModal] = useState(false);
  const [zapierWebhookUrl, setZapierWebhookUrl] = useState("");
  const [zapierSending, setZapierSending] = useState(false);

  const sendToZapier = async () => {
    if (!zapierWebhookUrl.trim()) {
      alert("Please enter your Zapier webhook URL");
      return;
    }

    if (!zapierWebhookUrl.startsWith("https://hooks.zapier.com/")) {
      alert("Please enter a valid Zapier webhook URL (starts with https://hooks.zapier.com/)");
      return;
    }

    setZapierSending(true);
    try {
      const response = await fetch("/api/zapier/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audit,
          score,
          breakdown,
          tasks,
          zapierWebhookUrl,
          metadata: {
            auditUrl: window.location.href,
            email: userEmail || null,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send to Zapier");
      }

      alert("✅ Audit data sent to Zapier successfully!");
      setShowZapierModal(false);
    } catch (e: any) {
      console.error("Zapier send error:", e);
      alert(`Failed to send to Zapier: ${e.message}`);
    } finally {
      setZapierSending(false);
    }
  };

  const testZapierWebhook = async () => {
    if (!zapierWebhookUrl.trim()) {
      alert("Please enter webhook URL first");
      return;
    }

    try {
      const response = await fetch(`/api/zapier/webhook/test?url=${encodeURIComponent(zapierWebhookUrl)}`);
      const result = await response.json();

      if (result.success) {
        alert("✅ Webhook test successful! Check your Zapier logs.");
      } else {
        alert(`❌ Webhook test failed: ${result.error || "Unknown error"}`);
      }
    } catch (e: any) {
      alert(`Webhook test error: ${e.message}`);
    }
  };

  const subscribeToMonitoring = async () => {
    if (!monitoringEmail.trim()) {
      alert("Please enter your email address");
      return;
    }

    try {
      // In production, create Stripe subscription
      const response = await fetch("/api/monitoring/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: monitoringEmail,
          settings: monitoringSettings,
          audit,
          competitors,
        }),
      });

      if (!response.ok) throw new Error("Subscription failed");

      setHasActiveMonitoring(true);
      alert("✅ Monitoring activated! You'll receive your first report within 24 hours.");
      setShowMonitoringModal(false);
    } catch (e) {
      console.error("Monitoring subscription error:", e);
      alert("Failed to activate monitoring. Please try again.");
    }
  };

  // Competitor comparison state
  const [competitors, setCompetitors] = useState<AuditInput[]>([
    {
      businessName: "Competitor A",
      city: "Los Angeles",
      primaryCategory: "Personal injury attorney",
      reviewCount: 45,
      rating: 4.7,
      photosLast30d: 5,
      hasQA: true,
      postsPerMonth: 3,
      hasWebsite: true,
      hasHours: true,
      hasServices: true,
      hasBookingLink: true,
      hasDuplicateListing: false,
      napConsistent: true,
    },
    {
      businessName: "Competitor B",
      city: "Los Angeles",
      primaryCategory: "Personal injury attorney",
      reviewCount: 120,
      rating: 4.8,
      photosLast30d: 10,
      hasQA: true,
      postsPerMonth: 6,
      hasWebsite: true,
      hasHours: true,
      hasServices: true,
      hasBookingLink: true,
      hasDuplicateListing: false,
      napConsistent: true,
    },
  ]);

  // Load shared audit from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("shared");
    if (shared) {
      try {
        const decoded = JSON.parse(atob(shared));
        if (decoded.audit) setAudit(decoded.audit);
        if (decoded.whiteLabelConfig) setWhiteLabelConfig(decoded.whiteLabelConfig);
      } catch (e) {
        console.error("Failed to load shared audit", e);
      }
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white">
      <header className="sticky top-0 z-40 backdrop-blur bg-neutral-950/80 border-b border-white/10">
        <div className={`${CONTAINER} py-3 md:py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400" />
            <span className="text-lg font-semibold tracking-tight">GME City</span>
          </div>
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <button onClick={() => setTab("audit")} className={`px-3 py-1.5 rounded-lg ${tab === "audit" ? "bg-white text-black" : "hover:bg-white/10"}`}>Audit</button>
            <button onClick={() => setTab("compare")} className={`px-3 py-1.5 rounded-lg ${tab === "compare" ? "bg-white text-black" : "hover:bg-white/10"}`}>Compare</button>
            <button onClick={() => setTab("citations")} className={`px-3 py-1.5 rounded-lg ${tab === "citations" ? "bg-white text-black" : "hover:bg-white/10"}`}>Citations</button>
            <button onClick={() => setTab("schema")} className={`px-3 py-1.5 rounded-lg ${tab === "schema" ? "bg-white text-black" : "hover:bg-white/10"}`}>Schema</button>
            <button onClick={() => setTab("data")} className={`px-3 py-1.5 rounded-lg ${tab === "data" ? "bg-white text-black" : "hover:bg-white/10"}`}>Data</button>
            <a href="#start" onClick={(e) => { e.preventDefault(); auditRef.current?.scrollIntoView({ behavior: "smooth" }); }} className={`${BTN_PRIMARY} ml-2`}>Start free audit</a>
          </nav>
          <button aria-label="Open menu" className="md:hidden p-2 rounded-lg border border-white/20" onClick={() => setMobileOpen(v => !v)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          {mobileOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-neutral-900/95 border-b border-white/10 z-50">
              <div className={`${CONTAINER} py-4 flex flex-col space-y-2 text-sm`}>
                <button onClick={() => { setTab("audit"); setMobileOpen(false); }} className="text-left px-3 py-2 rounded-lg hover:bg-white/10">Audit</button>
                <button onClick={() => { setTab("compare"); setMobileOpen(false); }} className="text-left px-3 py-2 rounded-lg hover:bg-white/10">Compare</button>
                <button onClick={() => { setTab("citations"); setMobileOpen(false); }} className="text-left px-3 py-2 rounded-lg hover:bg-white/10">Citations</button>
                <button onClick={() => { setTab("schema"); setMobileOpen(false); }} className="text-left px-3 py-2 rounded-lg hover:bg-white/10">Schema</button>
                <button onClick={() => { setTab("data"); setMobileOpen(false); }} className="text-left px-3 py-2 rounded-lg hover:bg-white/10">Data</button>
                <a href="#start" onClick={(e) => { e.preventDefault(); setMobileOpen(false); auditRef.current?.scrollIntoView({ behavior: "smooth" }); }} className={`${BTN_PRIMARY} text-center`}>Start free audit</a>
              </div>
            </div>
          )}
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className={`${SECTION_Y} relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-90 md:opacity-100 bg-[radial-gradient(900px_400px_at_50%_-10%,rgba(16,185,129,0.25),transparent_60%)]" />
          <div className={`${CONTAINER} grid md:grid-cols-2 ${GRID_GAP} items-center`}>
            <div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] max-w-[14ch]">Rank higher on Maps with a plan that writes itself</h1>
              <p className="mt-5 text-lg text-white/80 max-w-prose">Plug in your business, get a live score, then ship the exact fixes that move the needle. No fluff. Just tasks that produce calls.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#start" onClick={(e) => { e.preventDefault(); auditRef.current?.scrollIntoView({ behavior: "smooth" }); }} className={BTN_PRIMARY}>Start free audit</a>
                <a href="#schema" onClick={(e) => { e.preventDefault(); setTab("schema"); }} className={BTN_GHOST}>Build schema</a>
              </div>
              <div className="mt-6 text-sm text-white/70">No login. No credit card. Save your plan as a PDF when you are done.</div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-3xl blur-xl" />
              <div className={`${CARD} relative`}>
                <div className="text-sm text-white/70">Live score</div>
                <div className="mt-2 flex items-end gap-4">
                  <div className="text-6xl md:text-7xl font-black tracking-tight transition-all duration-500 will-change-auto">{animatedScore}</div>
                  <div className="pb-2 text-white/60">out of 100</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:text-base">
                  {Object.entries(breakdown).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-4">
                      <span className="text-white/80">{k}</span>
                      <span className="text-white/60">{Math.round(v)}</span>
                    </div>
                  ))}
                </div>
                <div className={`mt-4 ${PROGRESS_BG}`}>
                  <div className={PROGRESS_FG} style={{ width: `${score}%` }} />
                </div>
                <div className="mt-4 text-sm text-white/70">Improve the score by knocking out the tasks below</div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Section 1: SEO Snapshot Score (Local + Onsite) */}
        <SEOSnapshotSection />

        {/* Feature Section 2: Google Business Profile Check */}
        <section className={`${CONTAINER} ${SECTION_Y}`}>
          <div className="feature-card">
            <div className={CARD}>
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Google Business Profile Checker</h2>
                <p className="mt-3 text-white/70 max-w-2xl mx-auto">Verify your Google Business Profile presence instantly — the #1 ranking factor for local search</p>
              </div>

              <CitationCoverageCheck />
            </div>
          </div>
        </section>

        {/* Feature Section 3: Keyword Opportunity Scanner */}
        <section className={`${CONTAINER} ${SECTION_Y}`}>
          <div className="prelogin-module">
            <div className={CARD}>
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Find High-Intent Keywords</h2>
                <p className="mt-3 text-white/70 max-w-2xl mx-auto">Discover the keywords your competitors are ranking for</p>
              </div>

              <KeywordOpportunityScanner />
            </div>
          </div>
        </section>

        {/* Tabs content */}
        <section id="start" ref={auditRef} className={`${CONTAINER} ${SECTION_Y}`}>
          {tab === "audit" && (
            <div className={`grid lg:grid-cols-2 ${GRID_GAP}`}>
              <div className={CARD}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Instant Google Business Profile audit</h2>
                    <p className="mt-1 text-white/70 text-sm">Fill the form. Your score updates live.</p>
                  </div>
                  <button
                    className={`${BTN_GHOST} text-xs flex items-center gap-2`}
                    onClick={() => setShowGMBModal(true)}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import from GMB
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Business name</span>
                    <input className={INPUT} value={audit.businessName} onChange={(e) => setAudit(a => ({ ...a, businessName: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">City</span>
                    <input className={INPUT} value={audit.city} onChange={(e) => setAudit(a => ({ ...a, city: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Primary category</span>
                    <input className={INPUT} value={audit.primaryCategory} onChange={(e) => setAudit(a => ({ ...a, primaryCategory: e.target.value }))} />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Review count</span>
                    <input type="number" className={INPUT} value={audit.reviewCount} min={0} onChange={(e) => setAudit(a => ({ ...a, reviewCount: Math.floor(parseNumberInput(e.target.value, 0)) }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Average rating</span>
                    <input type="number" step="0.1" min={1} max={5} className={INPUT} value={audit.rating} onChange={(e) => setAudit(a => ({ ...a, rating: parseRatingInput(e.target.value) }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Photos added last 30 days</span>
                    <input type="number" min={0} className={INPUT} value={audit.photosLast30d} onChange={(e) => setAudit(a => ({ ...a, photosLast30d: Math.floor(parseNumberInput(e.target.value, 0)) }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Posts per month</span>
                    <input type="number" min={0} className={INPUT} value={audit.postsPerMonth} onChange={(e) => setAudit(a => ({ ...a, postsPerMonth: Math.floor(parseNumberInput(e.target.value, 0)) }))} />
                  </label>

                  {/* Toggles */}
                  {([
                    ["Website linked", "hasWebsite"],
                    ["Hours set", "hasHours"],
                    ["Services filled", "hasServices"],
                    ["Booking link present", "hasBookingLink"],
                    ["Q and A present", "hasQA"],
                    ["Duplicate listing exists", "hasDuplicateListing"],
                    ["NAP consistent across citations", "napConsistent"],
                  ] as const).map(([label, key]) => (
                    <label key={String(key)} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      <span className="text-white/80">{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-label={label}
                        aria-checked={(audit as any)[key] ? true : false}
                        tabIndex={0}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            setAudit(a => ({ ...a, [key]: !(a as any)[key] } as any));
                          }
                        }}
                        onClick={() => setAudit(a => ({ ...a, [key]: !(a as any)[key] } as any))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${(audit as any)[key] ? "bg-emerald-400" : "bg-white/20"}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${(audit as any)[key] ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                    </label>
                  ))}
                </div>
              </div>

              <div className={CARD}>
                <div className="flex items-center justify-between text-sm">
                  <h3 className="text-xl font-semibold">Score and priorities</h3>
                  <span className={`px-2.5 py-1 rounded-lg ${score >= 80 ? "bg-emerald-500/20 text-emerald-300" : score >= 60 ? "bg-yellow-500/20 text-yellow-300" : "bg-red-500/20 text-red-300"}`}>{score >= 80 ? "Great" : score >= 60 ? "Okay" : "Needs work"}</span>
                </div>
                <div className={`mt-4 ${PROGRESS_BG}`}>
                  <div className={PROGRESS_FG} style={{ width: `${score}%` }} />
                </div>
                <h3 className="text-xl font-semibold mt-6">Action plan</h3>
                {tasks.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">Perfect score! No action items needed</div>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {tasks.map((t, i) => (
                      <li key={i} className="rounded-xl border border-white/10 p-4 md:p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-medium">{t.title}</div>
                          <span className={`text-xs px-2.5 py-1 rounded-lg ${t.impact === "High" ? "bg-red-500/20 text-red-300" : t.impact === "Medium" ? "bg-yellow-500/20 text-yellow-300" : "bg-emerald-500/20 text-emerald-300"}`}>{t.impact}</span>
                        </div>
                        <p className="mt-1 text-sm text-white/70">{t.why}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <button className={BTN_PRIMARY}>Book a strategy call</button>
                    <button className={BTN_GHOST} onClick={() => setShowSaveModal(true)}>
                      {savedAuditId ? '✓ Saved' : 'Save audit'}
                    </button>
                    <button className={BTN_GHOST} onClick={doPrint}>Save as PDF</button>
                    <button className={BTN_GHOST} onClick={() => setShowEmailModal(true)}>Email report</button>
                    <button className={BTN_GHOST} onClick={generateShareableLink}>Share link</button>
                    <button className={BTN_GHOST} onClick={() => setShowZapierModal(true)}>Send to Zapier</button>
                    <button className={BTN_GHOST} onClick={() => setShowWhiteLabelModal(true)}>White-label</button>
                  </div>
                  {printMsg && <span className="text-sm text-white/60">{printMsg}</span>}
                  {savedAuditId && <span className="text-sm text-emerald-400">Audit ID: {savedAuditId.substring(0, 8)}...</span>}
                </div>

                {/* Monitoring Upsell */}
                {!hasActiveMonitoring && (
                  <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          <h4 className="font-semibold text-emerald-300">Never Miss a Change</h4>
                        </div>
                        <p className="text-sm text-white/80 mb-3">
                          Get automated weekly reports tracking your score, reviews, and competitor movements. Stay ahead with instant alerts.
                        </p>
                        <ul className="text-sm text-white/70 space-y-1 mb-4">
                          <li>• Weekly score change reports via email</li>
                          <li>• Instant alerts if reviews drop below threshold</li>
                          <li>• Notifications when competitors pass you in Local Pack</li>
                          <li>• Track ranking changes automatically</li>
                        </ul>
                        <div className="flex items-center gap-3">
                          <button className={BTN_PRIMARY} onClick={() => setShowMonitoringModal(true)}>
                            Enable Monitoring - $29/month
                          </button>
                          <span className="text-xs text-white/60">Cancel anytime</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {hasActiveMonitoring && (
                  <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Monitoring Active</span>
                      <span className="text-white/60 text-sm ml-auto">Next report in 3 days</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "compare" && (
            <div className="space-y-8">
              <div className={CARD}>
                <h2 className="text-2xl font-semibold tracking-tight">Competitor Comparison</h2>
                <p className="mt-1 text-white/70 text-sm">See how you stack up against your top competitors</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 text-white/80 font-semibold">Metric</th>
                      <th className="text-center p-3 text-white/80 font-semibold bg-emerald-500/10">
                        Your Business
                        <div className="text-xs font-normal text-white/60 mt-1">{audit.businessName || "Your Business"}</div>
                      </th>
                      {competitors.map((comp, idx) => (
                        <th key={idx} className="text-center p-3 text-white/80 font-semibold">
                          {comp.businessName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10 bg-white/5">
                      <td className="p-3 font-semibold">Overall Score</td>
                      <td className="text-center p-3 bg-emerald-500/10">
                        <div className="text-2xl font-bold">{score}</div>
                        <div className="text-xs text-white/60">/100</div>
                      </td>
                      {competitors.map((comp, idx) => {
                        const compScore = computeScore(comp).score;
                        const isAhead = score > compScore;
                        return (
                          <td key={idx} className="text-center p-3">
                            <div className={`text-2xl font-bold ${isAhead ? 'text-red-400' : 'text-emerald-400'}`}>{compScore}</div>
                            <div className="text-xs text-white/60">/100</div>
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b border-white/10">
                      <td className="p-3 text-white/80">Review Count</td>
                      <td className="text-center p-3 bg-emerald-500/5">
                        <span className="font-semibold">{audit.reviewCount}</span>
                      </td>
                      {competitors.map((comp, idx) => {
                        const isAhead = audit.reviewCount > comp.reviewCount;
                        return (
                          <td key={idx} className={`text-center p-3 font-semibold ${isAhead ? 'text-red-400' : 'text-emerald-400'}`}>
                            {comp.reviewCount}
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b border-white/10">
                      <td className="p-3 text-white/80">Average Rating</td>
                      <td className="text-center p-3 bg-emerald-500/5">
                        <span className="font-semibold">{audit.rating.toFixed(1)}★</span>
                      </td>
                      {competitors.map((comp, idx) => {
                        const isAhead = audit.rating > comp.rating;
                        return (
                          <td key={idx} className={`text-center p-3 font-semibold ${isAhead ? 'text-red-400' : 'text-emerald-400'}`}>
                            {comp.rating.toFixed(1)}★
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b border-white/10">
                      <td className="p-3 text-white/80">Photos (Last 30d)</td>
                      <td className="text-center p-3 bg-emerald-500/5">
                        <span className="font-semibold">{audit.photosLast30d}</span>
                      </td>
                      {competitors.map((comp, idx) => {
                        const isAhead = audit.photosLast30d > comp.photosLast30d;
                        return (
                          <td key={idx} className={`text-center p-3 font-semibold ${isAhead ? 'text-red-400' : 'text-emerald-400'}`}>
                            {comp.photosLast30d}
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b border-white/10">
                      <td className="p-3 text-white/80">Posts Per Month</td>
                      <td className="text-center p-3 bg-emerald-500/5">
                        <span className="font-semibold">{audit.postsPerMonth}</span>
                      </td>
                      {competitors.map((comp, idx) => {
                        const isAhead = audit.postsPerMonth > comp.postsPerMonth;
                        return (
                          <td key={idx} className={`text-center p-3 font-semibold ${isAhead ? 'text-red-400' : 'text-emerald-400'}`}>
                            {comp.postsPerMonth}
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b border-white/10">
                      <td className="p-3 text-white/80">Has Website</td>
                      <td className="text-center p-3 bg-emerald-500/5">
                        <span className="font-semibold">{audit.hasWebsite ? '✓' : '✗'}</span>
                      </td>
                      {competitors.map((comp, idx) => {
                        const isAhead = audit.hasWebsite && !comp.hasWebsite;
                        const isBehind = !audit.hasWebsite && comp.hasWebsite;
                        return (
                          <td key={idx} className={`text-center p-3 font-semibold ${isBehind ? 'text-emerald-400' : isAhead ? 'text-red-400' : ''}`}>
                            {comp.hasWebsite ? '✓' : '✗'}
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b border-white/10">
                      <td className="p-3 text-white/80">Services Listed</td>
                      <td className="text-center p-3 bg-emerald-500/5">
                        <span className="font-semibold">{audit.hasServices ? '✓' : '✗'}</span>
                      </td>
                      {competitors.map((comp, idx) => {
                        const isAhead = audit.hasServices && !comp.hasServices;
                        const isBehind = !audit.hasServices && comp.hasServices;
                        return (
                          <td key={idx} className={`text-center p-3 font-semibold ${isBehind ? 'text-emerald-400' : isAhead ? 'text-red-400' : ''}`}>
                            {comp.hasServices ? '✓' : '✗'}
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b border-white/10">
                      <td className="p-3 text-white/80">Booking Link</td>
                      <td className="text-center p-3 bg-emerald-500/5">
                        <span className="font-semibold">{audit.hasBookingLink ? '✓' : '✗'}</span>
                      </td>
                      {competitors.map((comp, idx) => {
                        const isAhead = audit.hasBookingLink && !comp.hasBookingLink;
                        const isBehind = !audit.hasBookingLink && comp.hasBookingLink;
                        return (
                          <td key={idx} className={`text-center p-3 font-semibold ${isBehind ? 'text-emerald-400' : isAhead ? 'text-red-400' : ''}`}>
                            {comp.hasBookingLink ? '✓' : '✗'}
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b border-white/10">
                      <td className="p-3 text-white/80">Q&A Present</td>
                      <td className="text-center p-3 bg-emerald-500/5">
                        <span className="font-semibold">{audit.hasQA ? '✓' : '✗'}</span>
                      </td>
                      {competitors.map((comp, idx) => {
                        const isAhead = audit.hasQA && !comp.hasQA;
                        const isBehind = !audit.hasQA && comp.hasQA;
                        return (
                          <td key={idx} className={`text-center p-3 font-semibold ${isBehind ? 'text-emerald-400' : isAhead ? 'text-red-400' : ''}`}>
                            {comp.hasQA ? '✓' : '✗'}
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b border-white/10">
                      <td className="p-3 text-white/80">NAP Consistent</td>
                      <td className="text-center p-3 bg-emerald-500/5">
                        <span className="font-semibold">{audit.napConsistent ? '✓' : '✗'}</span>
                      </td>
                      {competitors.map((comp, idx) => {
                        const isAhead = audit.napConsistent && !comp.napConsistent;
                        const isBehind = !audit.napConsistent && comp.napConsistent;
                        return (
                          <td key={idx} className={`text-center p-3 font-semibold ${isBehind ? 'text-emerald-400' : isAhead ? 'text-red-400' : ''}`}>
                            {comp.napConsistent ? '✓' : '✗'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className={CARD}>
                <h3 className="text-xl font-semibold mb-4">Key Insights</h3>
                <div className="space-y-3 text-sm">
                  {competitors.map((comp, idx) => {
                    const compScore = computeScore(comp).score;
                    const scoreDiff = score - compScore;
                    const reviewDiff = audit.reviewCount - comp.reviewCount;
                    const ratingDiff = audit.rating - comp.rating;

                    return (
                      <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="font-semibold text-white mb-2">vs {comp.businessName}</div>
                        <ul className="space-y-1 text-white/70">
                          <li>
                            {scoreDiff > 0 ? (
                              <span className="text-red-400">You're ahead by {scoreDiff} points</span>
                            ) : scoreDiff < 0 ? (
                              <span className="text-emerald-400">You're behind by {Math.abs(scoreDiff)} points</span>
                            ) : (
                              <span>Tied in overall score</span>
                            )}
                          </li>
                          {reviewDiff < 0 && (
                            <li className="text-emerald-400">Need {Math.abs(reviewDiff)} more reviews to match</li>
                          )}
                          {ratingDiff < 0 && (
                            <li className="text-emerald-400">Need to improve rating by {Math.abs(ratingDiff).toFixed(1)} stars</li>
                          )}
                          {audit.photosLast30d < comp.photosLast30d && (
                            <li className="text-emerald-400">Add {comp.photosLast30d - audit.photosLast30d} more photos/month</li>
                          )}
                          {audit.postsPerMonth < comp.postsPerMonth && (
                            <li className="text-emerald-400">Increase posting to {comp.postsPerMonth} posts/month</li>
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "citations" && (
            <div className="space-y-8">
              {/* Hero Section */}
              <div className={CARD}>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Citation Builder</h2>
                <p className="mt-3 text-lg text-white/80 max-w-3xl">
                  Take your NAP once. Get finished listings everywhere. Your data prefilled. Your progress tracked. Your listings fixed.
                </p>
              </div>

              {/* Progress Stats */}
              <div className="grid sm:grid-cols-4 gap-4">
                <div className={`${CARD} p-6`}>
                  <div className="text-white/60 text-sm mb-1">Progress</div>
                  <div className="text-3xl font-bold text-emerald-400">{citationStats.completed}/{citationStats.total}</div>
                  <div className="text-xs text-white/60 mt-1">Complete</div>
                </div>
                <div className={`${CARD} p-6`}>
                  <div className="text-white/60 text-sm mb-1">Consistency</div>
                  <div className="text-3xl font-bold text-emerald-400">{citationStats.consistency}%</div>
                  <div className="text-xs text-white/60 mt-1">Score</div>
                </div>
                <div className={`${CARD} p-6`}>
                  <div className="text-white/60 text-sm mb-1">Pending</div>
                  <div className="text-3xl font-bold text-yellow-400">{citationStats.pending}</div>
                  <div className="text-xs text-white/60 mt-1">Codes needed</div>
                </div>
                <div className={`${CARD} p-6`}>
                  <div className="text-white/60 text-sm mb-1">Last sync</div>
                  <div className="text-xl font-bold">2 hrs</div>
                  <div className="text-xs text-white/60 mt-1">ago</div>
                </div>
              </div>

              {/* NAP Form - Single Source of Truth */}
              <div className={CARD}>
                <h3 className="text-2xl font-semibold mb-2">Single Source of Truth</h3>
                <p className="text-white/70 text-sm mb-6">
                  Enter your business details once. We'll use this exact data for all directory submissions.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Business Name *</span>
                    <input className={INPUT} value={citationNAP.businessName} onChange={(e) => setCitationNAP(n => ({ ...n, businessName: e.target.value }))} placeholder="ABC Law Firm" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Street Address *</span>
                    <input className={INPUT} value={citationNAP.street} onChange={(e) => setCitationNAP(n => ({ ...n, street: e.target.value }))} placeholder="123 Main St" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Suite/Unit</span>
                    <input className={INPUT} value={citationNAP.suite} onChange={(e) => setCitationNAP(n => ({ ...n, suite: e.target.value }))} placeholder="Suite 200" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">City *</span>
                    <input className={INPUT} value={citationNAP.city} onChange={(e) => setCitationNAP(n => ({ ...n, city: e.target.value }))} placeholder="Los Angeles" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">State *</span>
                    <input className={INPUT} value={citationNAP.state} onChange={(e) => setCitationNAP(n => ({ ...n, state: e.target.value }))} placeholder="CA" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">ZIP Code *</span>
                    <input className={INPUT} value={citationNAP.zip} onChange={(e) => setCitationNAP(n => ({ ...n, zip: e.target.value }))} placeholder="90012" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Phone *</span>
                    <input className={INPUT} value={citationNAP.phone} onChange={(e) => setCitationNAP(n => ({ ...n, phone: e.target.value }))} placeholder="(310) 555-1212" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Website</span>
                    <input className={INPUT} value={citationNAP.website} onChange={(e) => setCitationNAP(n => ({ ...n, website: e.target.value }))} placeholder="https://example.com" />
                  </label>
                  <label className="grid gap-1 text-sm col-span-full">
                    <span className="text-white/80">Primary Category *</span>
                    <input className={INPUT} value={citationNAP.category} onChange={(e) => setCitationNAP(n => ({ ...n, category: e.target.value }))} placeholder="Personal Injury Attorney" />
                  </label>
                  <label className="grid gap-1 text-sm col-span-full">
                    <span className="text-white/80">Business Description</span>
                    <textarea rows={3} className={INPUT} value={citationNAP.description} onChange={(e) => setCitationNAP(n => ({ ...n, description: e.target.value }))} placeholder="Describe your business in 2-3 sentences..." />
                  </label>
                </div>
                <button className={`${BTN_PRIMARY} mt-4`}>
                  Lock NAP & Generate Links
                </button>
              </div>

              {/* Directory Checklist */}
              <div className={CARD}>
                <h3 className="text-2xl font-semibold mb-6">Directory Checklist</h3>
                <div className="space-y-2">
                  {directories.map((dir, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-3 h-3 rounded-full ${
                          dir.status === "done" ? "bg-emerald-400" :
                          dir.status === "pending" ? "bg-yellow-400" :
                          dir.status === "submitted" ? "bg-blue-400" :
                          "bg-white/20"
                        }`} />
                        <div className="flex-1">
                          <div className="font-semibold flex items-center gap-2">
                            {dir.name}
                            {dir.importance === "high" && <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300">High Priority</span>}
                          </div>
                          <div className="text-xs text-white/60">{dir.category}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {dir.status === "done" && (
                          <span className="text-emerald-400 text-sm font-semibold">Done</span>
                        )}
                        {dir.status === "pending" && (
                          <span className="text-yellow-400 text-sm font-semibold">Pending code</span>
                        )}
                        {dir.status === "submitted" && (
                          <span className="text-blue-400 text-sm font-semibold">Submitted</span>
                        )}
                        {dir.status === "ready" && dir.hasPrefilledLink && (
                          <button className={`${BTN_GHOST} text-xs`} onClick={() => updateDirectoryStatus(dir.name, "submitted")}>
                            Open prefilled
                          </button>
                        )}
                        {dir.status === "ready" && !dir.hasPrefilledLink && (
                          <button className={`${BTN_GHOST} text-xs`}>
                            Copy template
                          </button>
                        )}
                        <button className={`${BTN_GHOST} text-xs`} onClick={() => updateDirectoryStatus(dir.name, "done")}>
                          Mark done
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Section */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className={`${CARD} ${selectedPlan === "done-for-you" ? "ring-2 ring-emerald-400" : ""}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold">Done For You</h3>
                      <p className="text-white/70 text-sm mt-1">We handle everything</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-emerald-400">$349</div>
                      <div className="text-xs text-white/60">per location</div>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>We submit and verify as many sites as possible</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>You only handle codes when platform demands it</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>Live dashboard with real-time updates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>Most clients finish 25+ sites in week one</span>
                    </li>
                  </ul>
                  <button
                    className={selectedPlan === "done-for-you" ? BTN_PRIMARY : BTN_GHOST}
                    onClick={() => setSelectedPlan("done-for-you")}
                  >
                    {selectedPlan === "done-for-you" ? "✓ Selected" : "Start done-for-you"}
                  </button>
                  <div className="mt-4 text-xs text-white/60">
                    Optional: $49/month monitoring for change tracking and alerts
                  </div>
                </div>

                <div className={`${CARD} ${selectedPlan === "do-it-with-you" ? "ring-2 ring-emerald-400" : ""}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold">Do It With You</h3>
                      <p className="text-white/70 text-sm mt-1">We guide, you submit</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-emerald-400">$199</div>
                      <div className="text-xs text-white/60">one-time</div>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>We prepare everything with prefilled links</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>You click submit using our templates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>We review your work and fix issues</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>Export everything to CSV anytime</span>
                    </li>
                  </ul>
                  <button
                    className={selectedPlan === "do-it-with-you" ? BTN_PRIMARY : BTN_GHOST}
                    onClick={() => setSelectedPlan("do-it-with-you")}
                  >
                    {selectedPlan === "do-it-with-you" ? "✓ Selected" : "Start do-it-with-you"}
                  </button>
                </div>
              </div>

              {/* Trust Signals */}
              <div className={`${CARD} bg-emerald-500/5`}>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-emerald-400 mb-2">25+ sites</div>
                    <div className="text-sm text-white/70">Most clients finish in week one</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400 mb-2">100%</div>
                    <div className="text-sm text-white/70">You own every login and listing</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400 mb-2">CSV Export</div>
                    <div className="text-sm text-white/70">Export everything anytime</div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              {selectedPlan && (
                <div className={`${CARD} text-center`}>
                  <h3 className="text-2xl font-bold mb-2">Ready to get started?</h3>
                  <p className="text-white/70 mb-6">
                    Complete your purchase and we'll send you to the onboarding form. Your dashboard goes live within one business day.
                  </p>
                  <button className={`${BTN_PRIMARY} text-lg px-8 py-4`}>
                    Proceed to checkout →
                  </button>
                  <div className="mt-4 text-sm text-white/60">
                    Secure payment via Stripe • Money-back guarantee
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "schema" && (
            <div className={`grid lg:grid-cols-2 ${GRID_GAP}`} id="schema">
              <div className={CARD}>
                <h2 className="text-2xl font-semibold tracking-tight">LocalBusiness schema generator</h2>
                <p className="mt-1 text-white/70 text-sm">Paste the script into your site head or use a tag manager</p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Name</span>
                    <input className={INPUT} value={schemaForm.name} onChange={(e) => setSchemaForm(s => ({ ...s, name: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Website</span>
                    <input className={INPUT} value={schemaForm.url} onChange={(e) => setSchemaForm(s => ({ ...s, url: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Phone</span>
                    <input className={INPUT} value={schemaForm.phone} onChange={(e) => setSchemaForm(s => ({ ...s, phone: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Street</span>
                    <input className={INPUT} value={schemaForm.street1} onChange={(e) => setSchemaForm(s => ({ ...s, street1: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Suite</span>
                    <input className={INPUT} value={schemaForm.street2 || ""} onChange={(e) => setSchemaForm(s => ({ ...s, street2: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">City</span>
                    <input className={INPUT} value={schemaForm.city} onChange={(e) => setSchemaForm(s => ({ ...s, city: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Region</span>
                    <input className={INPUT} value={schemaForm.region} onChange={(e) => setSchemaForm(s => ({ ...s, region: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Postal</span>
                    <input className={INPUT} value={schemaForm.postal} onChange={(e) => setSchemaForm(s => ({ ...s, postal: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Country</span>
                    <input className={INPUT} value={schemaForm.country} onChange={(e) => setSchemaForm(s => ({ ...s, country: e.target.value }))} />
                  </label>
                </div>
              </div>

              <div className={CARD}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Script</h3>
                  <button
                    className={BTN_PRIMARY}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(`<script type="application/ld+json">\n${schemaJson}\n<\\/script>`);
                        alert("Schema copied to clipboard");
                      } catch (e) {
                        notifyError("Copy schema", e);
                      }
                    }}
                  >
                    Copy
                  </button>
                </div>
                <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl bg-black/60 p-4 text-emerald-200 text-sm whitespace-pre-wrap break-words">{`<script type="application/ld+json">
${schemaJson}
</script>`}</pre>
              </div>
            </div>
          )}

          {tab === "data" && (
            <div className={`grid lg:grid-cols-2 ${GRID_GAP}`}>
              <div className={CARD}>
                <h2 className="text-2xl font-semibold tracking-tight">PageSpeed Insights</h2>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">URL</span>
                    <input className={INPUT} value={psiUrl} onChange={(e) => setPsiUrl(e.target.value)} />
                  </label>
                  <button
                    onClick={runPSI}
                    disabled={!API_ENABLED}
                    aria-disabled={!API_ENABLED}
                    className={`${BTN_PRIMARY} disabled:opacity-50 disabled:cursor-not-allowed self-end`}
                  >
                    {psiLoading ? "Running..." : "Run"}
                  </button>
                </div>
                {!API_ENABLED && <div className="mt-3 text-xs text-white/70">Configure API keys to enable live data</div>}
                {psi && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-white/60 text-xs">Score</div><div className="text-lg font-semibold">{String(psi.score ?? "")}</div></div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-white/60 text-xs">LCP</div><div className="text-lg font-semibold">{psi.lcp ?? ""}</div></div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-white/60 text-xs">CLS</div><div className="text-lg font-semibold">{psi.cls ?? ""}</div></div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-white/60 text-xs">TBT</div><div className="text-lg font-semibold">{psi.fid ?? ""}</div></div>
                  </div>
                )}
              </div>

              <div className={CARD}>
                <h2 className="text-2xl font-semibold tracking-tight">Local Pack snapshot</h2>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Query</span>
                    <input className={INPUT} value={lpQuery} onChange={(e) => setLpQuery(e.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Location</span>
                    <input className={INPUT} value={lpLocation} onChange={(e) => setLpLocation(e.target.value)} />
                  </label>
                  <button
                    onClick={runLocalPack}
                    disabled={!API_ENABLED}
                    aria-disabled={!API_ENABLED}
                    className={`${BTN_PRIMARY} disabled:opacity-50 disabled:cursor-not-allowed self-end`}
                  >
                    {lpLoading ? "Loading..." : "Fetch"}
                  </button>
                </div>
                {!API_ENABLED && <div className="mt-3 text-xs text-white/70">Configure API keys to enable live data</div>}
                <ul className="mt-4 space-y-2 text-sm">
                  {lp.slice(0, 10).map((b: any, i: number) => (
                    <li key={b.position ?? i} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                      <span className="truncate">{(b.position ?? i + 1)}. {b.title || b.name}</span>
                      <span className="text-white/60">{b.rating ? `${b.rating}★` : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={CARD}>
                <h2 className="text-2xl font-semibold tracking-tight">Yelp search</h2>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Term</span>
                    <input className={INPUT} value={yTerm} onChange={(e) => setYTerm(e.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/80">Location</span>
                    <input className={INPUT} value={yLoc} onChange={(e) => setYLoc(e.target.value)} />
                  </label>
                  <button
                    onClick={runYelp}
                    disabled={!API_ENABLED}
                    aria-disabled={!API_ENABLED}
                    className={`${BTN_PRIMARY} disabled:opacity-50 disabled:cursor-not-allowed self-end`}
                  >
                    {yLoading ? "Loading..." : "Fetch"}
                  </button>
                </div>
                {!API_ENABLED && <div className="mt-3 text-xs text-white/70">Configure API keys to enable live data</div>}
                <ul className="mt-4 space-y-2 text-sm">
                  {yelp.slice(0, 10).map((b: any) => (
                    <li key={b.id} className="rounded-lg border border-white/10 px-3 py-2">
                      <div className="font-medium truncate">{b.name}</div>
                      <div className="text-white/60">{b.location?.address1}, {b.location?.city}</div>
                      <div className="text-white/60">{b.rating ? `${b.rating}★ (${b.review_count})` : ""}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10">
          <div className={`${CONTAINER} py-10 text-sm text-white/60 flex flex-wrap items-center justify-between gap-4`}>
            <div>© {new Date().getFullYear()} GME City. Local SEO that ships.</div>
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-white transition">Privacy</a>
              <a href="/terms" className="hover:text-white transition">Terms</a>
              <a href="/contact" className="hover:text-white transition">Contact</a>
            </div>
          </div>
        </footer>
      </main>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEmailModal(false)}>
          <div className={`${CARD} max-w-md w-full`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Email Audit Report</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-white/60 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-white/70 mb-4">
              Send this audit report to your client's inbox with all recommendations and action items.
            </p>
            <label className="block mb-4">
              <span className="text-sm text-white/80 mb-2 block">Email address</span>
              <input
                type="email"
                className={INPUT}
                placeholder="client@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendEmailReport()}
              />
            </label>
            <div className="flex gap-3">
              <button
                className={BTN_PRIMARY}
                onClick={sendEmailReport}
                disabled={emailSending}
              >
                {emailSending ? "Sending..." : "Send report"}
              </button>
              <button className={BTN_GHOST} onClick={() => setShowEmailModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className={`${CARD} max-w-lg w-full`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Shareable Link</h3>
              <button onClick={() => setShowShareModal(false)} className="text-white/60 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-white/70 mb-4">
              Share this audit with anyone using this unique link. The link contains all audit data and will display with your white-label branding.
            </p>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 mb-4 break-all text-sm text-emerald-300">
              {shareableLink}
            </div>
            <div className="flex gap-3">
              <button className={BTN_PRIMARY} onClick={copyShareableLink}>
                Copy link
              </button>
              <button className={BTN_GHOST} onClick={() => setShowShareModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* White Label Modal */}
      {showWhiteLabelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowWhiteLabelModal(false)}>
          <div className={`${CARD} max-w-lg w-full`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">White-Label Settings</h3>
              <button onClick={() => setShowWhiteLabelModal(false)} className="text-white/60 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-white/70 mb-6">
              Customize the branding for reports and shareable links. Perfect for agencies presenting to clients.
            </p>
            <div className="space-y-4 mb-6">
              <label className="block">
                <span className="text-sm text-white/80 mb-2 block">Agency/Brand name</span>
                <input
                  type="text"
                  className={INPUT}
                  placeholder="Your Agency Name"
                  value={whiteLabelConfig.brandName}
                  onChange={(e) => setWhiteLabelConfig(c => ({ ...c, brandName: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm text-white/80 mb-2 block">Brand color (hex)</span>
                <div className="flex gap-3">
                  <input
                    type="color"
                    className="h-11 w-16 rounded-xl border border-white/10 bg-white/10 cursor-pointer"
                    value={whiteLabelConfig.brandColor}
                    onChange={(e) => setWhiteLabelConfig(c => ({ ...c, brandColor: e.target.value }))}
                  />
                  <input
                    type="text"
                    className={INPUT}
                    placeholder="#10b981"
                    value={whiteLabelConfig.brandColor}
                    onChange={(e) => setWhiteLabelConfig(c => ({ ...c, brandColor: e.target.value }))}
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-sm text-white/80 mb-2 block">Logo URL (optional)</span>
                <input
                  type="url"
                  className={INPUT}
                  placeholder="https://example.com/logo.png"
                  value={whiteLabelConfig.logoUrl}
                  onChange={(e) => setWhiteLabelConfig(c => ({ ...c, logoUrl: e.target.value }))}
                />
              </label>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6">
              <div className="text-xs text-white/60 mb-2">Preview</div>
              <div className="flex items-center gap-3">
                {whiteLabelConfig.logoUrl ? (
                  <img src={whiteLabelConfig.logoUrl} alt="Logo" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-xl" style={{ background: whiteLabelConfig.brandColor }} />
                )}
                <span className="font-semibold">{whiteLabelConfig.brandName}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className={BTN_PRIMARY} onClick={() => setShowWhiteLabelModal(false)}>
                Save settings
              </button>
              <button className={BTN_GHOST} onClick={() => {
                setWhiteLabelConfig({ brandName: "GME City", brandColor: "#10b981", logoUrl: "" });
                setShowWhiteLabelModal(false);
              }}>
                Reset to default
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Audit Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSaveModal(false)}>
          <div className={`${CARD} max-w-md w-full`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Save Audit to Database</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-white/60 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-white/70 mb-4">
              Save this audit to your database for historical tracking and analytics. Optionally provide an email to associate this audit with your account.
            </p>
            <label className="block mb-4">
              <span className="text-sm text-white/80 mb-2 block">Your email (optional)</span>
              <input
                type="email"
                className={INPUT}
                placeholder="you@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveAuditToDatabase()}
              />
              <p className="text-xs text-white/60 mt-2">This helps you find your audits later and track your progress over time.</p>
            </label>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4 text-sm">
              <div className="font-semibold mb-2">Audit Summary:</div>
              <div className="space-y-1 text-white/70">
                <div>Business: {audit.businessName || "Not entered"}</div>
                <div>Score: {score}/100</div>
                <div>City: {audit.city}</div>
                <div>Category: {audit.primaryCategory}</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className={BTN_PRIMARY}
                onClick={() => saveAuditToDatabase()}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save to database"}
              </button>
              <button className={BTN_GHOST} onClick={() => setShowSaveModal(false)}>
                Cancel
              </button>
            </div>
            {savedAuditId && (
              <div className="mt-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 p-3 text-sm text-emerald-300">
                ✓ Audit saved successfully! ID: {savedAuditId.substring(0, 8)}...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Automated Monitoring Modal */}
      {showMonitoringModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowMonitoringModal(false)}>
          <div className={`${CARD} max-w-2xl w-full`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold">Automated Monitoring</h3>
              <button onClick={() => setShowMonitoringModal(false)} className="text-white/60 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-emerald-400">$29</span>
                <span className="text-white/60">/month</span>
              </div>
              <p className="text-sm text-white/70">
                Never miss important changes to your Local SEO performance. Get automated tracking and instant alerts.
              </p>
            </div>

            <div className="space-y-6 mb-6">
              <div>
                <h4 className="font-semibold mb-3">What's included:</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="font-medium text-white">Weekly Email Reports</div>
                      <div className="text-white/60 text-xs">Score changes, review trends, photo updates</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="font-medium text-white">Review Alerts</div>
                      <div className="text-white/60 text-xs">Instant notification if rating drops</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="font-medium text-white">Competitor Tracking</div>
                      <div className="text-white/60 text-xs">Alert when competitors pass you</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="font-medium text-white">Ranking Changes</div>
                      <div className="text-white/60 text-xs">Track Local Pack position movements</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Configure your alerts:</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                    <span className="text-white/80">Weekly summary reports</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={monitoringSettings.weeklyReport}
                      onClick={() => setMonitoringSettings(s => ({ ...s, weeklyReport: !s.weeklyReport }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${monitoringSettings.weeklyReport ? "bg-emerald-400" : "bg-white/20"}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${monitoringSettings.weeklyReport ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </label>

                  <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                    <span className="text-white/80">Review drop alerts</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={monitoringSettings.reviewAlerts}
                      onClick={() => setMonitoringSettings(s => ({ ...s, reviewAlerts: !s.reviewAlerts }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${monitoringSettings.reviewAlerts ? "bg-emerald-400" : "bg-white/20"}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${monitoringSettings.reviewAlerts ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </label>

                  {monitoringSettings.reviewAlerts && (
                    <div className="ml-4 flex items-center gap-3">
                      <label className="text-sm text-white/70">Alert if rating drops below:</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="5"
                        className={`${INPUT} w-20`}
                        value={monitoringSettings.reviewThreshold}
                        onChange={(e) => setMonitoringSettings(s => ({ ...s, reviewThreshold: parseFloat(e.target.value) }))}
                      />
                      <span className="text-sm text-white/60">stars</span>
                    </div>
                  )}

                  <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                    <span className="text-white/80">Competitor movement alerts</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={monitoringSettings.competitorAlerts}
                      onClick={() => setMonitoringSettings(s => ({ ...s, competitorAlerts: !s.competitorAlerts }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${monitoringSettings.competitorAlerts ? "bg-emerald-400" : "bg-white/20"}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${monitoringSettings.competitorAlerts ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </label>

                  <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                    <span className="text-white/80">Local Pack ranking alerts</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={monitoringSettings.rankingAlerts}
                      onClick={() => setMonitoringSettings(s => ({ ...s, rankingAlerts: !s.rankingAlerts }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${monitoringSettings.rankingAlerts ? "bg-emerald-400" : "bg-white/20"}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${monitoringSettings.rankingAlerts ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </label>
                </div>
              </div>

              <div>
                <label className="block mb-2">
                  <span className="text-sm text-white/80">Email address for reports *</span>
                  <input
                    type="email"
                    required
                    className={`${INPUT} mt-1`}
                    placeholder="you@example.com"
                    value={monitoringEmail}
                    onChange={(e) => setMonitoringEmail(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-bold">$29<span className="text-base font-normal text-white/60">/month</span></div>
                  <div className="text-xs text-white/60">Cancel anytime • No commitment</div>
                </div>
                <button className={BTN_PRIMARY} onClick={subscribeToMonitoring}>
                  Start Monitoring
                </button>
              </div>
              <div className="text-xs text-white/60 text-center">
                Secure payment via Stripe • First report within 24 hours
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GMB Import Modal */}
      {showGMBModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGMBModal(false)}>
          <div className={`${CARD} max-w-lg w-full`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Import from Google My Business</h3>
              <button onClick={() => setShowGMBModal(false)} className="text-white/60 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-white/70 mb-6">
              Auto-populate the audit form with real data from your Google Business Profile. You'll need your Account ID, Location ID, and an OAuth access token.
            </p>

            <div className="space-y-4 mb-6">
              <label className="block">
                <span className="text-sm text-white/80 mb-2 block">Account ID *</span>
                <input
                  type="text"
                  className={INPUT}
                  placeholder="accounts/123456789"
                  value={gmbAccountId}
                  onChange={(e) => setGmbAccountId(e.target.value)}
                />
                <p className="text-xs text-white/60 mt-1">Find this in the GMB API Console</p>
              </label>

              <label className="block">
                <span className="text-sm text-white/80 mb-2 block">Location ID *</span>
                <input
                  type="text"
                  className={INPUT}
                  placeholder="locations/987654321"
                  value={gmbLocationId}
                  onChange={(e) => setGmbLocationId(e.target.value)}
                />
                <p className="text-xs text-white/60 mt-1">Your specific business location ID</p>
              </label>

              <label className="block">
                <span className="text-sm text-white/80 mb-2 block">Access Token *</span>
                <input
                  type="password"
                  className={INPUT}
                  placeholder="ya29.xxxxxxxxxxxxx"
                  value={gmbAccessToken}
                  onChange={(e) => setGmbAccessToken(e.target.value)}
                />
                <p className="text-xs text-white/60 mt-1">OAuth 2.0 token from Google Cloud Console</p>
              </label>
            </div>

            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 mb-6 text-sm">
              <div className="font-semibold text-blue-300 mb-2">📖 How to get your credentials:</div>
              <ol className="text-white/70 space-y-1 text-xs list-decimal list-inside">
                <li>Enable the Google My Business API in Google Cloud Console</li>
                <li>Create OAuth 2.0 credentials</li>
                <li>Get your Account ID from the GMB API Explorer</li>
                <li>Get your Location ID from your business listing</li>
                <li>Generate an access token using OAuth Playground</li>
              </ol>
              <a
                href="https://developers.google.com/my-business/content/basic-setup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-xs mt-2 inline-block"
              >
                Read full setup guide →
              </a>
            </div>

            <div className="flex gap-3">
              <button
                className={BTN_PRIMARY}
                onClick={fetchGMBData}
                disabled={gmbLoading}
              >
                {gmbLoading ? "Importing..." : "Import Data"}
              </button>
              <button className={BTN_GHOST} onClick={() => setShowGMBModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zapier Webhook Modal */}
      {showZapierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowZapierModal(false)}>
          <div className={`${CARD} max-w-lg w-full`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Send to Zapier</h3>
              <button onClick={() => setShowZapierModal(false)} className="text-white/60 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-white/70 mb-6">
              Send this audit result to your CRM, Slack, email automation, or any other tool via Zapier webhooks.
            </p>

            <div className="space-y-4 mb-6">
              <label className="block">
                <span className="text-sm text-white/80 mb-2 block">Zapier Webhook URL *</span>
                <input
                  type="url"
                  className={INPUT}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={zapierWebhookUrl}
                  onChange={(e) => setZapierWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-white/60 mt-1">Get this from your Zapier "Catch Hook" trigger</p>
              </label>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6 text-sm">
              <div className="font-semibold mb-2">What gets sent:</div>
              <ul className="text-white/70 space-y-1 text-xs">
                <li>• Business name, city, category</li>
                <li>• Score and breakdown</li>
                <li>• All action items with priorities</li>
                <li>• Review count, rating, photos, posts</li>
                <li>• Profile completeness flags</li>
              </ul>
            </div>

            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 mb-6 text-sm">
              <div className="font-semibold text-blue-300 mb-2">🔧 Popular Zap ideas:</div>
              <ul className="text-white/70 space-y-1 text-xs">
                <li>• Send to HubSpot/Salesforce as new lead</li>
                <li>• Post to Slack channel with score</li>
                <li>• Add to Google Sheets for tracking</li>
                <li>• Trigger email sequence in ActiveCampaign</li>
                <li>• Create task in Asana/Trello</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                className={BTN_PRIMARY}
                onClick={sendToZapier}
                disabled={zapierSending}
              >
                {zapierSending ? "Sending..." : "Send to Zapier"}
              </button>
              <button className={BTN_GHOST} onClick={testZapierWebhook}>
                Test webhook
              </button>
              <button className={BTN_GHOST} onClick={() => setShowZapierModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
