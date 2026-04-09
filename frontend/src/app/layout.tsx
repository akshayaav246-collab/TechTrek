import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, Bebas_Neue, DM_Serif_Display } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { SiteShell } from "@/components/layout/SiteShell";
import HomeLoader from "@/components/ui/HomeLoader";
import "./globals.css";
import "@/components/ui/Loader.css";

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
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@700&display=swap" rel="stylesheet" />
      </head>
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
          <div className="loader-glow" />

          <div className="loader-sparks">
            <div className="loader-spark" style={{ width: 4, height: 4, left: '20%', bottom: '20%', animationDuration: '3s', animationDelay: '0.2s' }} />
            <div className="loader-spark" style={{ width: 3, height: 3, left: '50%', bottom: '15%', animationDuration: '2s', animationDelay: '0.8s' }} />
            <div className="loader-spark" style={{ width: 5, height: 5, left: '80%', bottom: '25%', animationDuration: '4s', animationDelay: '0s' }} />
            <div className="loader-spark" style={{ width: 4, height: 4, left: '35%', bottom: '10%', animationDuration: '2.5s', animationDelay: '1s' }} />
            <div className="loader-spark" style={{ width: 3, height: 3, left: '65%', bottom: '30%', animationDuration: '3.5s', animationDelay: '0.5s' }} />
            <div className="loader-spark" style={{ width: 4, height: 4, left: '90%', bottom: '10%', animationDuration: '2s', animationDelay: '1.2s' }} />
            <div className="loader-spark" style={{ width: 5, height: 5, left: '10%', bottom: '35%', animationDuration: '4.5s', animationDelay: '0.3s' }} />
            <div className="loader-spark" style={{ width: 3, height: 3, left: '45%', bottom: '8%', animationDuration: '3s', animationDelay: '1.5s' }} />
          </div>

          <div className="loader-logo">
            <div className="loader-logo-text">
              <span className="loader-accent">Tech</span>
              <span className="loader-slash">/</span>Trek
            </div>
            <div className="loader-bar-accent">
              <div className="loader-bar-line" />
              <div className="loader-year">2 0 2 6</div>
              <div className="loader-bar-line" />
            </div>
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
