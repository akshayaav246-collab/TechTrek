import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, Bebas_Neue, DM_Serif_Display } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { SiteShell } from "@/components/layout/SiteShell";
import HomeLoader from "@/components/ui/HomeLoader";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  weight: "400",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TechTrek",
  description: "GKT Event Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${outfit.variable} ${plusJakartaSans.variable} ${bebasNeue.variable} ${dmSerifDisplay.variable} font-body antialiased`}
    >
      <body
        className={`min-h-screen flex flex-col font-body bg-background text-foreground overflow-x-hidden w-full max-w-full`}
      >
        {/* ── Pre-hydration Loader ─────────────────────────────────
            Rendered as plain HTML so it appears before React hydrates.
            The inline script reveals it synchronously based on sessionStorage.
        ──────────────────────────────────────────────────────────── */}
        <div id="tt-preloader" className="loader-overlay" style={{ display: 'none' }} suppressHydrationWarning>
          <div className="loader-bg" />
          <div className="loader-grid" />
          <div className="loader-logo">
            <div className="loader-logo-text">
              <span className="loader-accent">Tech</span>Trek
            </div>
            <div className="loader-year">2 0 2 6</div>
          </div>
          <div className="loader-tagline">Ignite Your Imagination</div>
          <div className="loader-track">
            <div className="loader-path">
              <div className="loader-fill" />
              <div className="loader-dot" />
            </div>
            <div className="loader-label">Loading experience</div>
          </div>
        </div>

        {/* Synchronous script: runs before React, shows the loader if first load */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function () {
            try {
              if (!sessionStorage.getItem('tt_loader_shown')) {
                var el = document.getElementById('tt-preloader');
                if (el) el.style.display = 'flex';
              }
            } catch (e) {}
          })();
        ` }} />

        {/* Client component that fades the loader out after bar animation */}
        <HomeLoader />

        <AuthProvider>
          <SiteShell>{children}</SiteShell>
        </AuthProvider>
      </body>
    </html>
  );
}
