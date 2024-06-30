import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

export const metadata: Metadata = {
  title: "Moodify — Mood-Driven Music Curation & Cross-Platform Playlist Exporter",
  description:
    "Describe how you feel to curate 5 tracks and 2 playlist directions with exact direct links across Spotify, YouTube Music, JioSaavn, and Apple Music — or convert playlists across platforms in one click.",
  openGraph: {
    title: "Moodify — Mood-Driven Music Curation & Playlist Exporter",
    description:
      "AI music curation and 4-platform playlist converter with exact track links across Spotify, YouTube Music, JioSaavn, and Apple Music.",
    url: "https://moodify.tanisheesh.in",
    siteName: "Moodify",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Moodify — Mood-Driven Music Curation & Playlist Exporter",
    description:
      "Curate mood-matched tracks or convert playlists across Spotify, YouTube Music, JioSaavn, and Apple Music.",
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
