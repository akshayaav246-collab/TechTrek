import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, Bebas_Neue, DM_Serif_Display } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { SiteShell } from "@/components/layout/SiteShell";
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
      className={`${outfit.variable} ${plusJakartaSans.variable} ${bebasNeue.variable} ${dmSerifDisplay.variable} font-body antialiased`}
    >
      <body
        className={`min-h-screen flex flex-col font-body bg-background text-foreground overflow-x-hidden w-full max-w-full`}
      >
        <AuthProvider>
          <SiteShell>{children}</SiteShell>
        </AuthProvider>
      </body>
    </html>
  );
}
