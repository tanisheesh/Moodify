import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "SPOTIFY_CLIENT_ID is not configured." },
      { status: 500 }
    );
  }

  const origin = request.nextUrl.origin.replace("localhost", "127.0.0.1");
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI?.trim() ||
    `${origin}/api/spotify/callback`;

  const scopes = ["playlist-modify-public", "playlist-modify-private"].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    show_dialog: "false",
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
}
