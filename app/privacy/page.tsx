"use client";
import React from "react";
import { ThemeLogo } from "../../components/theme-logo";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors">
      <header className="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-neutral-950/80 border-b border-neutral-300 dark:border-white/10 transition-colors">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <ThemeLogo className="h-12 w-auto sm:h-14" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-neutral-600 dark:text-white/70">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="mt-12 space-y-8 text-neutral-700 dark:text-white/80 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Introduction</h2>
            <p>
              GMB City ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Local SEO audit tool and related services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Information We Collect</h2>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-4 mb-2">Information You Provide</h3>
            <p className="mb-3">When you use our audit tool, you voluntarily provide:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Business name and location information</li>
              <li>Business category and operational details</li>
              <li>Google Business Profile metrics (review count, ratings, etc.)</li>
              <li>Contact information if you request a strategy call</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-4 mb-2">Automatically Collected Information</h3>
            <p className="mb-3">When you visit our website, we may automatically collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address and browser information</li>
              <li>Device type and operating system</li>
              <li>Pages visited and time spent on our site</li>
              <li>Referring URLs and search terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">How We Use Your Information</h2>
            <p className="mb-3">We use collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Generate your Local SEO audit score and recommendations</li>
              <li>Provide LocalBusiness schema markup</li>
              <li>Fetch competitor data from third-party APIs (PageSpeed, Local Pack, Yelp)</li>
              <li>Improve our tool and user experience</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Send service-related communications (with your consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Data Storage and Security</h2>
            <p className="mb-3">
              Your audit data is processed in your browser and is not permanently stored on our servers unless you explicitly request a strategy call. We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encrypted data transmission (HTTPS/TLS)</li>
              <li>Secure API key management</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Third-Party Services</h2>
            <p className="mb-3">
              We use the following third-party services to provide our tool functionality:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google PageSpeed Insights API</strong> - To analyze website performance</li>
              <li><strong>SerpAPI</strong> - To fetch Google Maps Local Pack results</li>
              <li><strong>Yelp Fusion API</strong> - To retrieve business listings and competitor data</li>
            </ul>
            <p className="mt-3">
              These services have their own privacy policies. We encourage you to review them:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Google Privacy Policy</a></li>
              <li><a href="https://serpapi.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">SerpAPI Privacy Policy</a></li>
              <li><a href="https://www.yelp.com/tos/privacy_policy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Yelp Privacy Policy</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Cookies and Tracking</h2>
            <p>
              We may use cookies and similar tracking technologies to enhance your experience. You can control cookie preferences through your browser settings. Disabling cookies may limit some functionality of our tool.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Your Rights</h2>
            <p className="mb-3">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Data Portability:</strong> Receive your data in a machine-readable format</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Children's Privacy</h2>
            <p>
              Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your rights, please contact us at:
            </p>
            <p className="mt-3">
              <strong>Email:</strong> <a href="mailto:info@gmb.city" className="text-emerald-400 hover:underline">info@gmb.city</a><br />
              <strong>Website:</strong> <a href="https://www.gmb.city" className="text-emerald-400 hover:underline">https://www.gmb.city</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-neutral-300 dark:border-white/10 mt-16 transition-colors">
        <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-neutral-600 dark:text-white/60 flex flex-wrap items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} GMB City. Local SEO that ships.</div>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms</a>
            <a href="/contact" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
