import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const userToken = request.cookies.get("moodify_sp_user_token")?.value;

  if (!userToken) {
    return NextResponse.json(
      { error: "NOT_AUTHENTICATED", message: "Please connect your Spotify account first." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      uris?: string[];
    };

    const playlistName = body.name?.trim() || "Moodify Curated Playlist";
    const description =
      body.description?.trim() ||
      "Converted and curated with Moodify (moodify.tanisheesh.in)";
    const uris = Array.isArray(body.uris)
      ? body.uris.filter((u) => typeof u === "string" && u.startsWith("spotify:track:"))
      : [];

    if (uris.length === 0) {
      return NextResponse.json(
        { error: "NO_TRACKS", message: "No matching Spotify tracks to export." },
        { status: 400 }
      );
    }

    // Create playlist via /v1/me/playlists
    const createRes = await fetch("https://api.spotify.com/v1/me/playlists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: playlistName,
        description,
        public: false,
      }),
    });

    if (createRes.status === 401) {
      return NextResponse.json(
        { error: "NOT_AUTHENTICATED", message: "Spotify session expired. Please reconnect." },
        { status: 401 }
      );
    }

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json(
        { error: "CREATE_FAILED", message: `Failed to create playlist on Spotify: ${errText}` },
        { status: createRes.status }
      );
    }

    const createdPlaylist = (await createRes.json()) as {
      id: string;
      external_urls?: { spotify?: string };
    };

    // Add tracks to the newly created playlist
    const addTracksRes = await fetch(
      `https://api.spotify.com/v1/playlists/${createdPlaylist.id}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: uris.slice(0, 100),
        }),
      }
    );

    if (!addTracksRes.ok) {
      const errText = await addTracksRes.text();
      return NextResponse.json(
        { error: "ADD_TRACKS_FAILED", message: `Playlist created, but adding tracks failed: ${errText}` },
        { status: addTracksRes.status }
      );
    }

    const playlistUrl =
      createdPlaylist.external_urls?.spotify ||
      `https://open.spotify.com/playlist/${createdPlaylist.id}`;

    return NextResponse.json({
      success: true,
      playlistId: createdPlaylist.id,
      playlistUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: "SERVER_ERROR", message }, { status: 500 });
  }
}
