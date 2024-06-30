import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="background:#09090b;color:#f4f4f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: "SPOTIFY_AUTH_ERROR", error: ${JSON.stringify(
              error || "Authorization cancelled"
            )} }, "*");
            window.close();
          }
        </script>
        <p>Spotify authorization cancelled. You can close this window.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  const origin = request.nextUrl.origin.replace("localhost", "127.0.0.1");
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI?.trim() ||
    `${origin}/api/spotify/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Spotify credentials missing" },
      { status: 500 }
    );
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
    };

    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || "Token exchange failed");
    }

    const response = new NextResponse(
      `<!DOCTYPE html><html><body style="background:#09090b;color:#f4f4f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: "SPOTIFY_AUTH_SUCCESS" }, "*");
            window.close();
          } else {
            window.location.href = "/";
          }
        </script>
        <p>Connected to Spotify. Closing window...</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );

    response.cookies.set("moodify_sp_user_token", tokenData.access_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: tokenData.expires_in ?? 3600,
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth error";
    return new NextResponse(
      `<!DOCTYPE html><html><body style="background:#09090b;color:#f4f4f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: "SPOTIFY_AUTH_ERROR", error: ${JSON.stringify(
              message
            )} }, "*");
            window.close();
          }
        </script>
        <p>Error: ${message}</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
