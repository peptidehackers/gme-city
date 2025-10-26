"use client";
import React, { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    business: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, send to your backend or email service
    const mailtoLink = `mailto:info@gmb.city?subject=Contact from ${encodeURIComponent(formData.name)}&body=${encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nBusiness: ${formData.business}\n\nMessage:\n${formData.message}`
    )}`;
    window.location.href = mailtoLink;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white">
      <header className="sticky top-0 z-40 backdrop-blur bg-neutral-950/80 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="GMB City Logo" className="h-12 w-auto sm:h-14" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Contact Us</h1>
        <p className="mt-4 text-base sm:text-lg text-white/70">
          Have questions about Local SEO? Want to discuss a strategy for your business? We're here to help.
        </p>

        <div className="mt-8 sm:mt-12 grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-10">
          {/* Contact Form */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Send us a message</h2>

            {submitted ? (
              <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 p-4 text-emerald-300">
                <p className="font-semibold">Thank you for reaching out!</p>
                <p className="text-sm mt-2">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/80 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/80 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/80 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={formData.business}
                    onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="ABC Law Firm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/80 mb-1">Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="Tell us about your Local SEO goals..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-5 py-3 rounded-xl bg-emerald-400 text-black font-semibold hover:bg-emerald-500 transition"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Get in Touch</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-white/80 font-medium">Email</p>
                    <a href="mailto:info@gmb.city" className="text-emerald-400 hover:underline">info@gmb.city</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <div>
                    <p className="text-white/80 font-medium">Website</p>
                    <a href="https://gme.city" className="text-emerald-400 hover:underline">https://gme.city</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-white/80 font-medium">Response Time</p>
                    <p className="text-white/60">Within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">What We Offer</h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">✓</span>
                  <span>Free Google Business Profile audits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">✓</span>
                  <span>Custom Local SEO strategy sessions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">✓</span>
                  <span>Citation building and NAP consistency fixes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">✓</span>
                  <span>Review management campaigns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">✓</span>
                  <span>Schema markup implementation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">✓</span>
                  <span>Competitor analysis and benchmarking</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <h3 className="text-xl font-semibold mb-3">Quick Links</h3>
              <div className="space-y-2">
                <a href="/" className="block text-emerald-400 hover:underline">← Back to Audit Tool</a>
                <a href="/privacy" className="block text-emerald-400 hover:underline">Privacy Policy</a>
                <a href="/terms" className="block text-emerald-400 hover:underline">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-12 sm:mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10 text-sm text-white/60 flex flex-wrap items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} GMB City. Local SEO that ships.</div>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/contact" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
