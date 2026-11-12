import "server-only";
import type {
  EnrichedSongMetadata,
  EnrichedPlaylistMetadata,
  GeneratedYouTubePlaylistLinks,
} from "@/types/music";
import {
  BROWSER_USER_AGENT,
  decodeHtmlEntities,
  extractPrimaryArtist,
} from "@/lib/utils";

let cachedSpotifyToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }

  if (cachedSpotifyToken && Date.now() < cachedSpotifyToken.expiresAt - 30_000) {
    return cachedSpotifyToken.token;
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(3500),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return null;

    cachedSpotifyToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return cachedSpotifyToken.token;
  } catch {
    return null;
  }
}

async function resolveSpotifySong(name: string, artist: string) {
  const token = await getSpotifyAccessToken();
  if (!token) return null;

  try {
    const primaryArtist = extractPrimaryArtist(artist);
    const strictQuery = `track:${name} artist:${primaryArtist}`;
    const strictUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(strictQuery)}&type=track&limit=1`;
    const res = await fetch(strictUrl, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, any>;
    let track = data?.tracks?.items?.[0];

    if (!track?.id) {
      const broadUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(`${name} ${primaryArtist}`)}&type=track&limit=1`;
      const broadRes = await fetch(broadUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
        next: { revalidate: 86400 },
      });
      if (broadRes.ok) {
        const broadData = (await broadRes.json()) as Record<string, any>;
        track = broadData?.tracks?.items?.[0];
      }
    }

    if (!track?.id) return null;

    const releaseYear = track?.album?.release_date
      ? String(track.album.release_date).slice(0, 4)
      : undefined;

    return {
      spotifyTrackId: String(track.id),
      spotifyUrl:
        track?.external_urls?.spotify ??
        `https://open.spotify.com/track/${track.id}`,
      artworkUrl: track?.album?.images?.[0]?.url as string | undefined,
      previewUrl: (track?.preview_url as string | null) ?? undefined,
      album: track?.album?.name as string | undefined,
      releaseYear,
    };
  } catch {
    return null;
  }
}

async function resolveSpotifyPlaylist(query: string) {
  const token = await getSpotifyAccessToken();
  if (!token) return null;

  try {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=1`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, any>;
    const pl = data?.playlists?.items?.find(Boolean);
    if (!pl?.id) return null;

    return {
      spotifyPlaylistId: String(pl.id),
      spotifyUrl:
        pl?.external_urls?.spotify ??
        `https://open.spotify.com/playlist/${pl.id}`,
      artworkUrl: pl?.images?.[0]?.url as string | undefined,
    };
  } catch {
    return null;
  }
}

async function searchYouTubeMusicInternal(
  query: string,
  params?: string
): Promise<string | null> {
  try {
    const body: Record<string, unknown> = {
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: "1.20250101.01.00",
          hl: "en",
          gl: "IN",
        },
      },
      query,
    };
    if (params) {
      body.params = params;
    }

    const res = await fetch(
      "https://music.youtube.com/youtubei/v1/search?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://music.youtube.com",
          "User-Agent": BROWSER_USER_AGENT,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(4000),
        next: { revalidate: 86400 },
      }
    );

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function resolveYouTubeSong(name: string, artist: string) {
  try {
    const primaryArtist = extractPrimaryArtist(artist);
    const query = `${name} ${primaryArtist}`.trim();

    // 1. Official YouTube Music Songs catalog filter
    const songsJson = await searchYouTubeMusicInternal(
      query,
      "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D"
    );
    let videoId = songsJson?.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)?.[1];

    // 2. Fallback to unfiltered YouTube Music search (covers Videos / Live / Regional uploads)
    if (!videoId) {
      const generalJson = await searchYouTubeMusicInternal(query);
      videoId = generalJson?.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)?.[1];
    }

    if (!videoId) return null;

    return {
      youtubeVideoId: videoId,
      youtubeMusicUrl: `https://music.youtube.com/watch?v=${videoId}`,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      artworkUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}

async function resolveYouTubePlaylist(name: string, genres: string[]) {
  try {
    const genreHint = genres.slice(0, 2).join(" ");
    const query = `${name} ${genreHint}`.trim();

    const plJson = await searchYouTubeMusicInternal(
      query,
      "EgWKAQIoAWoKEAkQBRAKEAMQBA%3D%3D"
    );
    let rawId = plJson?.match(/"browseId":"VL([a-zA-Z0-9_-]+)"/)?.[1];

    if (!rawId) {
      const generalJson = await searchYouTubeMusicInternal(`${query} playlist`);
      rawId =
        generalJson?.match(/"browseId":"VL([a-zA-Z0-9_-]+)"/)?.[1] ??
        generalJson?.match(/"playlistId":"((?:PL|OL|RD)[a-zA-Z0-9_-]+)"/)?.[1];
    }

    if (!rawId) return null;

    return {
      youtubePlaylistId: rawId,
      youtubeMusicUrl: `https://music.youtube.com/playlist?list=${rawId}`,
    };
  } catch {
    return null;
  }
}

export async function generateYouTubePlaylistLinks(
  videoIds: string[]
): Promise<GeneratedYouTubePlaylistLinks> {
  const validIds = videoIds.filter(Boolean).slice(0, 50);
  if (validIds.length === 0) return {};

  const watchVideosUrl = `https://www.youtube.com/watch_videos?video_ids=${validIds.join(",")}`;

  try {
    const res = await fetch(watchVideosUrl, {
      redirect: "manual",
      headers: { "User-Agent": BROWSER_USER_AGENT },
      signal: AbortSignal.timeout(3500),
      cache: "no-store",
    });

    const location = res.headers.get("location");
    const listId = location?.match(/[?&]list=([^&]+)/)?.[1];

    if (listId) {
      return {
        playlistId: listId,
        youtubePlaylistUrl: `https://www.youtube.com/playlist?list=${listId}`,
        youtubeMusicPlaylistUrl: `https://music.youtube.com/watch?v=${validIds[0]}&list=${listId}`,
        youtubeQueueUrl: `https://www.youtube.com/watch?v=${validIds[0]}&list=${listId}`,
      };
    }
  } catch {
    // Fallback to watch_videos URL if redirect inspection fails
  }

  return {
    youtubePlaylistUrl: watchVideosUrl,
    youtubeMusicPlaylistUrl: `https://music.youtube.com/watch?v=${validIds[0]}`,
    youtubeQueueUrl: watchVideosUrl,
  };
}

async function resolveJioSaavnSong(name: string, artist: string) {
  try {
    const primaryArtist = extractPrimaryArtist(artist);
    const query = `${name} ${primaryArtist}`;
    const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=1&p=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, any>;
    const item = data?.results?.[0];
    if (!item?.perma_url) return null;

    const highResImage =
      typeof item.image === "string"
        ? item.image.replace("150x150", "500x500").replace("50x50", "500x500")
        : undefined;

    let fullAudioUrl: string | undefined;
    const encryptedUrl = item?.more_info?.encrypted_media_url;
    if (typeof encryptedUrl === "string" && encryptedUrl.length > 0) {
      try {
        const authRes = await fetch(
          `https://www.jiosaavn.com/api.php?__call=song.generateAuthToken&url=${encodeURIComponent(
            encryptedUrl
          )}&bitrate=320&api_version=4&_format=json&ctx=web6dot0&_marker=0`,
          {
            signal: AbortSignal.timeout(2500),
            next: { revalidate: 3600 },
          }
        );
        if (authRes.ok) {
          const authData = (await authRes.json()) as { auth_url?: string };
          if (authData?.auth_url) {
            fullAudioUrl = authData.auth_url;
          }
        }
      } catch {
        // Ignore stream auth errors
      }
    }

    const vlinkPreview =
      typeof item?.more_info?.vlink === "string" &&
      item.more_info.vlink.length > 0
        ? item.more_info.vlink
        : undefined;

    const albumStr = decodeHtmlEntities(item?.more_info?.album);

    return {
      jioSaavnUrl: String(item.perma_url),
      artworkUrl: highResImage,
      fullAudioUrl,
      previewUrl: fullAudioUrl ?? vlinkPreview,
      album: albumStr || undefined,
      releaseYear: item?.year ? String(item.year) : undefined,
    };
  } catch {
    return null;
  }
}

async function resolveJioSaavnPlaylist(
  name: string,
  genres: string[],
  language: string
) {
  try {
    const query = `${name} ${language} ${genres[0] ?? ""}`.trim();
    const url = `https://www.jiosaavn.com/api.php?__call=search.getPlaylistResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=1&p=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, any>;
    let item = data?.results?.[0];

    if (!item?.perma_url && genres.length > 0) {
      const fallbackQuery = `${language} ${genres[0]} hits`.trim();
      const fallbackUrl = `https://www.jiosaavn.com/api.php?__call=search.getPlaylistResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=1&p=1&q=${encodeURIComponent(fallbackQuery)}`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3000),
        next: { revalidate: 86400 },
      });
      if (fallbackRes.ok) {
        const fallbackData = (await fallbackRes.json()) as Record<string, any>;
        item = fallbackData?.results?.[0];
      }
    }

    if (!item?.perma_url) return null;

    const highResImage =
      typeof item.image === "string"
        ? item.image.replace("150x150", "500x500").replace("50x50", "500x500")
        : undefined;

    return {
      jioSaavnUrl: String(item.perma_url),
      artworkUrl: highResImage,
    };
  } catch {
    return null;
  }
}

async function resolveItunesSong(name: string, artist: string) {
  try {
    const primaryArtist = extractPrimaryArtist(artist);
    const query = `${name} ${primaryArtist}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, any>;
    const match = data?.results?.[0];
    if (!match) return null;

    const highResArtwork =
      typeof match.artworkUrl100 === "string"
        ? match.artworkUrl100.replace(/100x100bb/g, "600x600bb")
        : undefined;

    const releaseYear = match.releaseDate
      ? new Date(match.releaseDate).getFullYear().toString()
      : undefined;

    return {
      appleMusicUrl: match.trackViewUrl as string | undefined,
      artworkUrl: highResArtwork,
      previewUrl: match.previewUrl as string | undefined,
      album: match.collectionName as string | undefined,
      releaseYear:
        releaseYear && releaseYear !== "NaN" ? releaseYear : undefined,
    };
  } catch {
    return null;
  }
}

export async function enrichSongAcrossPlatforms(
  name: string,
  artist: string
): Promise<EnrichedSongMetadata> {
  const [spotify, youtube, jiosaavn, itunes] = await Promise.all([
    resolveSpotifySong(name, artist),
    resolveYouTubeSong(name, artist),
    resolveJioSaavnSong(name, artist),
    resolveItunesSong(name, artist),
  ]);

  return {
    artworkUrl:
      spotify?.artworkUrl ??
      itunes?.artworkUrl ??
      jiosaavn?.artworkUrl ??
      youtube?.artworkUrl,
    fullAudioUrl: jiosaavn?.fullAudioUrl,
    previewUrl:
      jiosaavn?.fullAudioUrl ??
      itunes?.previewUrl ??
      spotify?.previewUrl ??
      jiosaavn?.previewUrl,
    album: spotify?.album ?? itunes?.album ?? jiosaavn?.album,
    releaseYear:
      spotify?.releaseYear ?? itunes?.releaseYear ?? jiosaavn?.releaseYear,
    youtubeVideoId: youtube?.youtubeVideoId,
    youtubeMusicUrl: youtube?.youtubeMusicUrl,
    youtubeUrl: youtube?.youtubeUrl,
    jioSaavnUrl: jiosaavn?.jioSaavnUrl,
    spotifyTrackId: spotify?.spotifyTrackId,
    spotifyUrl: spotify?.spotifyUrl,
    appleMusicUrl: itunes?.appleMusicUrl,
  };
}

export async function enrichPlaylistAcrossPlatforms(
  name: string,
  genres: string[],
  language: string
): Promise<EnrichedPlaylistMetadata> {
  const [spotify, youtube, jiosaavn] = await Promise.all([
    resolveSpotifyPlaylist(`${name} ${genres[0] ?? ""}`.trim()),
    resolveYouTubePlaylist(name, genres),
    resolveJioSaavnPlaylist(name, genres, language),
  ]);

  return {
    artworkUrl: spotify?.artworkUrl ?? jiosaavn?.artworkUrl,
    youtubePlaylistId: youtube?.youtubePlaylistId,
    youtubeMusicUrl: youtube?.youtubeMusicUrl,
    jioSaavnUrl: jiosaavn?.jioSaavnUrl,
    spotifyPlaylistId: spotify?.spotifyPlaylistId,
    spotifyUrl: spotify?.spotifyUrl,
  };
}
