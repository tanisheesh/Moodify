import { ImageResponse } from "next/og";

export const alt =
  "Moodify — Mood-Driven Music Studio & Cross-Platform Playlist Exporter";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          padding: "64px 72px",
          color: "#f4f4f5",
          fontFamily: "sans-serif",
          backgroundImage:
            "radial-gradient(circle at 85% 15%, rgba(225, 29, 72, 0.22), transparent 45%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: 800,
                color: "#e11d48",
              }}
            >
              M
            </div>
            <span
              style={{
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#e4e4e7",
              }}
            >
              MOODIFY STUDIO
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 18px",
              borderRadius: "9999px",
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              fontSize: "16px",
              color: "#a1a1aa",
            }}
          >
            moodify.tanisheesh.in
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: "66px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.08,
              color: "#fafafa",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Soundtracks built from how you feel.</span>
            <span style={{ color: "#e11d48" }}>
              Playlists moved across any platform.
            </span>
          </div>

          <p
            style={{
              fontSize: "24px",
              color: "#a1a1aa",
              maxWidth: "880px",
              lineHeight: 1.45,
              margin: 0,
            }}
          >
            AI mood curation with exact track links, 320kbps HD queue playback,
            and 1-click playlist conversion across Spotify, YouTube Music,
            JioSaavn, and Apple Music.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #27272a",
            paddingTop: "28px",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", gap: "14px" }}>
            {["Spotify", "YouTube Music", "JioSaavn", "Apple Music"].map(
              (platform) => (
                <div
                  key={platform}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#d4d4d8",
                  }}
                >
                  {platform}
                </div>
              )
            )}
          </div>

          <div style={{ fontSize: "18px", color: "#71717a" }}>
            Tanish Poddar · tanisheesh.in
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
