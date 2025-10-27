"use client";
import React from "react";
import { ThemeToggle } from "../../components/theme-toggle";
import { ThemeLogo } from "../../components/theme-logo";

export default function TermsOfService() {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors">
      <header className="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-neutral-950/80 border-b border-neutral-300 dark:border-white/10 transition-colors">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <ThemeLogo className="h-12 w-auto sm:h-14" />
          </a>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Terms of Service</h1>
        <p className="mt-4 text-neutral-600 dark:text-white/70">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="mt-12 space-y-8 text-neutral-700 dark:text-white/80 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Agreement to Terms</h2>
            <p>
              By accessing or using GMB City's Local SEO audit tool and related services (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Description of Service</h2>
            <p className="mb-3">GMB City provides:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Instant GBP Audit:</strong> A scoring algorithm that evaluates Google Business Profile optimization</li>
              <li><strong>LocalBusiness Schema Generator:</strong> Tools to create JSON-LD structured data markup</li>
              <li><strong>Data API Dashboard:</strong> Access to PageSpeed Insights, Google Maps Local Pack data, and Yelp business information</li>
              <li><strong>Strategy Consultation:</strong> Optional paid consulting services for Local SEO optimization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">User Obligations</h2>
            <p className="mb-3">You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and truthful information when using our audit tool</li>
              <li>Use the Service only for lawful purposes and in compliance with all applicable laws</li>
              <li>Not attempt to reverse engineer, decompile, or extract the source code of the Service</li>
              <li>Not use automated systems (bots, scrapers) to access the Service without permission</li>
              <li>Not interfere with or disrupt the Service or servers</li>
              <li>Not misrepresent your affiliation with any business when using our tools</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Free vs. Paid Services</h2>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-4 mb-2">Free Services</h3>
            <p className="mb-3">The following features are provided free of charge:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>GBP audit score generation</li>
              <li>Action plan recommendations</li>
              <li>Schema markup generator</li>
              <li>Data API dashboard (subject to third-party API rate limits)</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-4 mb-2">Paid Services</h3>
            <p>
              Strategy consultations and implementation services are available for purchase. Pricing, terms, and refund policies for paid services will be provided before purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Accuracy and Limitations</h2>
            <p className="mb-3">
              Our audit tool provides recommendations based on general Local SEO best practices. However:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Results are estimates and not guarantees of ranking improvements</li>
              <li>Google's ranking algorithm is proprietary and subject to change</li>
              <li>Third-party API data (PageSpeed, Yelp, etc.) may have delays or inaccuracies</li>
              <li>Scores are based on the information you provide; inaccurate inputs yield inaccurate results</li>
              <li>We do not guarantee specific search engine rankings or business outcomes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Intellectual Property</h2>
            <p className="mb-3">
              All content, features, and functionality of the Service, including but not limited to text, graphics, logos, algorithms, and software, are owned by GMB City and protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You may not copy, modify, distribute, sell, or lease any part of our Service without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Third-Party APIs and Services</h2>
            <p className="mb-3">
              Our Service integrates with third-party APIs (Google PageSpeed Insights, SerpAPI, Yelp Fusion). Your use of these features is also subject to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><a href="https://developers.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Google API Terms of Service</a></li>
              <li><a href="https://serpapi.com/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">SerpAPI Terms of Service</a></li>
              <li><a href="https://www.yelp.com/developers/api_terms" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Yelp API Terms of Use</a></li>
            </ul>
            <p className="mt-3">
              We are not responsible for the availability, accuracy, or content of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, GME CITY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR USE, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="mt-3">
              IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless GMB City, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, or expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Inaccurate or misleading information you provide</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time, with or without cause or notice, for violations of these Terms or for any other reason at our discretion.
            </p>
            <p className="mt-3">
              Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Governing Law and Disputes</h2>
            <p className="mb-3">
              These Terms are governed by the laws of the State of California, United States, without regard to conflict of law principles.
            </p>
            <p className="mb-3">
              Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except that either party may seek injunctive relief in court.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the Service after changes constitutes acceptance of the updated Terms.
            </p>
            <p className="mt-3">
              Material changes will be communicated via email (if you've provided one) or prominent notice on our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Entire Agreement</h2>
            <p>
              These Terms, along with our Privacy Policy, constitute the entire agreement between you and GMB City regarding the Service and supersede any prior agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Contact Us</h2>
            <p>
              If you have questions about these Terms, please contact us at:
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
