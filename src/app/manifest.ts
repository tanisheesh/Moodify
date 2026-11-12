import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Moodify — Mood-Driven Music Studio & Playlist Exporter",
    short_name: "Moodify",
    description:
      "Mood-driven music curation and 4-platform playlist converter across Spotify, YouTube Music, JioSaavn, and Apple Music.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#e11d48",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
