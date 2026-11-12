import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const SITE_URL = "https://moodify.tanisheesh.in";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#09090b",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "Moodify — Mood-Driven Music Studio & Cross-Platform Playlist Exporter",
    template: "%s | Moodify",
  },
  description:
    "Describe how you feel to curate 5 tracks and 2 playlist directions with exact direct links across Spotify, YouTube Music, JioSaavn, and Apple Music — or convert playlists across platforms in one click.",
  keywords: [
    "Moodify",
    "AI music recommendation",
    "mood playlist generator",
    "playlist converter",
    "Spotify to YouTube Music",
    "YouTube Music to Spotify",
    "JioSaavn playlist converter",
    "Apple Music playlist converter",
    "Tanish Poddar",
  ],
  authors: [{ name: "Tanish Poddar", url: "https://tanisheesh.in" }],
  creator: "Tanish Poddar",
  publisher: "Tanish Poddar",
  category: "music",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title:
      "Moodify — Mood-Driven Music Studio & Cross-Platform Playlist Exporter",
    description:
      "Curate mood-matched tracks with live audio previews or convert playlists across Spotify, YouTube Music, JioSaavn, and Apple Music.",
    url: SITE_URL,
    siteName: "Moodify",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Moodify — Mood-Driven Music Studio & Cross-Platform Playlist Exporter",
    description:
      "Curate mood-matched tracks or convert playlists across Spotify, YouTube Music, JioSaavn, and Apple Music.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Moodify",
  url: SITE_URL,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  description:
    "Mood-driven music curation studio and 4-platform playlist converter across Spotify, YouTube Music, JioSaavn, and Apple Music.",
  author: {
    "@type": "Person",
    name: "Tanish Poddar",
    url: "https://tanisheesh.in",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-[#09090b] text-zinc-100 antialiased overflow-x-hidden",
          GeistSans.variable,
          GeistMono.variable
        )}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
