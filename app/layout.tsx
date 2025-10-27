import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GMB City - Get Ranked on Google Today",
  description: "Free Google Business Profile audit tool. Discover optimization opportunities, boost local rankings, and dominate Google Maps search. Expert Local SEO solutions in Los Angeles, CA.",
  keywords: ["Google Business Profile", "Local SEO", "GBP audit", "Google Maps ranking", "Los Angeles SEO", "local search optimization", "business listing optimization"],
  authors: [{ name: "GMB City" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.gmb.city",
    siteName: "GMB City",
    title: "GMB City - Get Ranked on Google Today",
    description: "Free Google Business Profile audit tool. Discover optimization opportunities, boost local rankings, and dominate Google Maps search.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 1200,
        alt: "GMB City - Get Ranked on Google Today",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GMB City - Get Ranked on Google Today",
    description: "Free Google Business Profile audit tool. Discover optimization opportunities and boost your local rankings.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" }
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "GMB City",
    statusBarStyle: "black-translucent",
  },
  metadataBase: new URL("https://www.gmb.city"),
};

function Footer() {
  return (
    <footer className="border-t border-neutral-300 dark:border-white/10 bg-neutral-100/50 dark:bg-black/50 backdrop-blur-sm mt-16 transition-colors">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
          {/* Business Name */}
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">GMB City</h3>
            <p className="text-sm text-neutral-600 dark:text-white/60">Local SEO Solutions</p>
          </div>

          {/* NAP Information */}
          <div className="text-center md:text-right space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-center md:justify-end gap-2 text-neutral-700 dark:text-white/80">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs sm:text-sm">
                2029 Century Park E Suite 438, Los Angeles, CA 90067
              </span>
            </div>
            <div className="flex items-center justify-center md:justify-end gap-2 text-neutral-700 dark:text-white/80">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <a href="tel:+14245995312" className="text-sm hover:text-emerald-400 transition-colors">
                (424) 599-5312
              </a>
            </div>
            <div className="flex items-center justify-center md:justify-end gap-2 text-neutral-700 dark:text-white/80">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a href="mailto:info@gmbcity.com" className="text-sm hover:text-emerald-400 transition-colors">
                info@gmbcity.com
              </a>
            </div>
            <div className="flex items-center justify-center md:justify-end gap-2 text-neutral-700 dark:text-white/80">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs sm:text-sm">
                <div>Mon-Fri: 6AM - 5PM</div>
                <div>Sat: 9AM - 3PM | Sun: Closed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-neutral-300 dark:border-white/10 text-center text-sm text-neutral-600 dark:text-white/60">
          © {new Date().getFullYear()} GMB City. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Footer />
      </body>
    </html>
  );
}
