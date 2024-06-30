import "server-only";
import Groq from "groq-sdk";
import {
  enrichSongAcrossPlatforms,
  generateYouTubePlaylistLinks,
  type EnrichedSongMetadata,
} from "./music-platforms";

export type SourcePlatform =
  | "spotify"
  | "youtube"
  | "jiosaavn"
  | "apple-music";

export interface RawPlaylistTrack {
  name: string;
  artist: string;
}

export interface ImportedPlaylistInfo {
  platform: SourcePlatform;
  title: string;
  description?: string;
  coverUrl?: string;
  sourceUrl: string;
  totalFound: number;
  tracks: RawPlaylistTrack[];
}

export interface ConvertedTrack extends RawPlaylistTrack, EnrichedSongMetadata {}

export interface PlaylistConversionResult {
  source: {
    platform: SourcePlatform;
    title: string;
    coverUrl?: string;
    sourceUrl: string;
    totalFound: number;
    convertedCount: number;
  };
  tracks: ConvertedTrack[];
  youtubePlaylistUrl?: string;
  youtubeMusicPlaylistUrl?: string;
  youtubeQueueUrl?: string;
  spotifyTrackUris: string[];
}

const MAX_TRACKS_TO_CONVERT = 50;

export function detectPlaylistPlatform(urlStr: string): SourcePlatform | null {
  try {
    const url = new URL(urlStr.trim());
    const host = url.hostname.toLowerCase();

    if (host.includes("spotify.com")) return "spotify";
    if (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("music.youtube.com")
    ) {
      return "youtube";
    }
    if (host.includes("jiosaavn.com") || host.includes("saavn.com")) {
      return "jiosaavn";
    }
    if (host.includes("music.apple.com") || host.includes("itunes.apple.com")) {
      return "apple-music";
    }
    return null;
  } catch {
    return null;
  }
}

function decodeEntities(str?: string): string {
  if (!str) return "";
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function importSpotifyPlaylist(
  urlStr: string
): Promise<ImportedPlaylistInfo> {
  const url = new URL(urlStr.trim());
  const match = url.pathname.match(/playlist\/([a-zA-Z0-9]+)/);
  const playlistId = match?.[1];
  if (!playlistId) {
    throw new Error(
      "Invalid Spotify playlist URL. Expected format: https://open.spotify.com/playlist/..."
    );
  }

  const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
  const res = await fetch(embedUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      "Could not fetch Spotify playlist. Make sure the playlist is public."
    );
  }

  const html = await res.text();
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!nextDataMatch?.[1]) {
    throw new Error("Could not parse Spotify playlist metadata.");
  }

  const nextData = JSON.parse(nextDataMatch[1]);
  const entity = nextData?.props?.pageProps?.state?.data?.entity;
  if (!entity) {
    throw new Error("Spotify playlist data not found.");
  }

  const rawList: any[] = Array.isArray(entity.trackList)
    ? entity.trackList
    : [];
  const tracks: RawPlaylistTrack[] = rawList
    .map((item) => ({
      name: String(item?.title ?? "").trim(),
      artist: String(item?.subtitle ?? "")
        .replace(/\u00a0/g, " ")
        .trim(),
    }))
    .filter((t) => t.name.length > 0);

  const coverUrl =
    entity?.coverArt?.sources?.[0]?.url ??
    entity?.images?.[0]?.url ??
    undefined;

  return {
    platform: "spotify",
    title: String(entity?.name ?? entity?.title ?? "Spotify Playlist").trim(),
    coverUrl,
    sourceUrl: `https://open.spotify.com/playlist/${playlistId}`,
    totalFound: tracks.length,
    tracks: tracks.slice(0, MAX_TRACKS_TO_CONVERT),
  };
}

async function importYouTubePlaylist(
  urlStr: string
): Promise<ImportedPlaylistInfo> {
  const url = new URL(urlStr.trim());
  const listId = url.searchParams.get("list");
  if (!listId) {
    throw new Error(
      "No 'list=' parameter found in YouTube URL. Please paste a YouTube or YouTube Music playlist URL."
    );
  }

  const browseId = listId.startsWith("VL") ? listId : `VL${listId}`;
  const res = await fetch(
    "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://music.youtube.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: "1.20250101.01.00",
            hl: "en",
            gl: "IN",
          },
        },
        browseId,
      }),
      signal: AbortSignal.timeout(6500),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      "Could not fetch YouTube playlist. Ensure the playlist is public or unlisted."
    );
  }

  const data = await res.json();
  const items: any[] = [];
  let playlistTitle = "";
  let coverUrl: string | undefined;

  function walk(node: any) {
    if (!node || typeof node !== "object") return;
    if (
      !playlistTitle &&
      (node.musicDetailHeaderRenderer?.title?.runs?.[0]?.text ||
        node.musicResponsiveHeaderRenderer?.title?.runs?.[0]?.text)
    ) {
      playlistTitle =
        node.musicDetailHeaderRenderer?.title?.runs?.[0]?.text ??
        node.musicResponsiveHeaderRenderer?.title?.runs?.[0]?.text ??
        "";
    }
    if (
      !coverUrl &&
      node.musicThumbnailRenderer?.thumbnail?.thumbnails?.length
    ) {
      const thumbs = node.musicThumbnailRenderer.thumbnail.thumbnails;
      coverUrl = thumbs[thumbs.length - 1]?.url;
    }
    if (node.musicResponsiveListItemRenderer) {
      items.push(node.musicResponsiveListItemRenderer);
      return;
    }
    if (node.playlistVideoRenderer) {
      items.push({ _legacyVideo: node.playlistVideoRenderer });
      return;
    }
    for (const k of Object.keys(node)) {
      walk(node[k]);
    }
  }

  walk(data);

  const tracks: RawPlaylistTrack[] = [];

  for (const item of items) {
    if (item._legacyVideo) {
      const v = item._legacyVideo;
      const title = v?.title?.runs?.[0]?.text ?? "";
      const channel = v?.shortBylineText?.runs?.[0]?.text ?? "";
      if (title) tracks.push({ name: title.trim(), artist: channel.trim() });
      continue;
    }

    const flexCols = item?.flexColumns;
    const title =
      flexCols?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]
        ?.text ?? "";
    const artistRuns =
      flexCols?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ??
      [];
    const artist = artistRuns.map((r: any) => r?.text ?? "").join("").trim();

    if (title) {
      tracks.push({ name: String(title).trim(), artist });
    }
  }

  if (tracks.length === 0) {
    throw new Error(
      "No tracks found in this YouTube playlist. Make sure it is a public playlist."
    );
  }

  return {
    platform: "youtube",
    title: playlistTitle || "YouTube Playlist",
    coverUrl,
    sourceUrl: `https://music.youtube.com/playlist?list=${listId}`,
    totalFound: tracks.length,
    tracks: tracks.slice(0, MAX_TRACKS_TO_CONVERT),
  };
}

async function importJioSaavnPlaylist(
  urlStr: string
): Promise<ImportedPlaylistInfo> {
  const url = new URL(urlStr.trim());
  const parts = url.pathname.split("/").filter(Boolean);
  const token = parts[parts.length - 1];
  if (!token) {
    throw new Error("Invalid JioSaavn playlist URL.");
  }

  const apiUrl = `https://www.jiosaavn.com/api.php?__call=webapi.get&token=${encodeURIComponent(
    token
  )}&type=playlist&p=1&n=50&includeMetaTags=0&ctx=web6dot0&api_version=4&_format=json&_marker=0`;

  const res = await fetch(apiUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Could not fetch JioSaavn playlist.");
  }

  const data = (await res.json()) as any;
  const rawList: any[] = Array.isArray(data?.list) ? data.list : [];
  if (rawList.length === 0) {
    throw new Error("No songs found in this JioSaavn playlist.");
  }

  const tracks: RawPlaylistTrack[] = rawList
    .map((item) => {
      const primaryArtists =
        item?.more_info?.artistMap?.primary_artists
          ?.map((a: any) => a?.name)
          .filter(Boolean)
          .join(", ") ||
        item?.subtitle ||
        "";

      return {
        name: decodeEntities(item?.title),
        artist: decodeEntities(primaryArtists),
      };
    })
    .filter((t) => t.name.length > 0);

  const coverUrl =
    typeof data?.image === "string"
      ? data.image.replace("150x150", "500x500")
      : undefined;

  return {
    platform: "jiosaavn",
    title: decodeEntities(data?.title) || "JioSaavn Playlist",
    coverUrl,
    sourceUrl: urlStr.trim(),
    totalFound: tracks.length,
    tracks: tracks.slice(0, MAX_TRACKS_TO_CONVERT),
  };
}

async function importAppleMusicPlaylist(
  urlStr: string
): Promise<ImportedPlaylistInfo> {
  const res = await fetch(urlStr.trim(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(6500),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Could not load Apple Music playlist.");
  }

  const html = await res.text();
  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
  const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);

  const sDataMatch = html.match(
    /<script type="application\/json" id="serialized-server-data">([\s\S]*?)<\/script>/
  );
  if (!sDataMatch?.[1]) {
    throw new Error("Could not parse Apple Music playlist tracks.");
  }

  const parsed = JSON.parse(sDataMatch[1]);
  const tracks: RawPlaylistTrack[] = [];

  function walk(node: any) {
    if (!node || typeof node !== "object") return;
    if (node.contentDescriptor?.kind === "song" && node.title) {
      const artist =
        node.subtitleLinks?.[0]?.title ?? node.artistName ?? "";
      tracks.push({
        name: String(node.title).trim(),
        artist: String(artist).trim(),
      });
      return;
    }
    for (const k of Object.keys(node)) {
      walk(node[k]);
    }
  }

  walk(parsed);

  if (tracks.length === 0) {
    throw new Error("No songs found in this Apple Music playlist.");
  }

  return {
    platform: "apple-music",
    title:
      decodeEntities(titleMatch?.[1]?.replace(/ on Apple Music$/i, "")) ||
      "Apple Music Playlist",
    coverUrl: imageMatch?.[1],
    sourceUrl: urlStr.trim(),
    totalFound: tracks.length,
    tracks: tracks.slice(0, MAX_TRACKS_TO_CONVERT),
  };
}

async function cleanTrackTitlesWithAI(
  tracks: RawPlaylistTrack[],
  platform: SourcePlatform
): Promise<RawPlaylistTrack[]> {
  // Spotify, Apple Music, and JioSaavn already have clean canonical track/artist metadata
  if (platform !== "youtube") return tracks;

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || tracks.length === 0) return tracks;

  const needsCleaning = tracks.some((t) =>
    /[\[\(\|]|official|video|lyrics|audio|full song|slowed|reverb|ft\.|feat\./i.test(
      `${t.name} ${t.artist}`
    )
  );
  if (!needsCleaning) return tracks;

  try {
    const client = new Groq({ apiKey });
    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You clean messy music video titles into exact canonical song title and primary artist name. Return valid JSON only: {"tracks": [{"name": "...", "artist": "..."}]} with the exact same number and order of items.',
        },
        {
          role: "user",
          content: JSON.stringify({ tracks }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return tracks;

    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed?.tracks) &&
      parsed.tracks.length === tracks.length
    ) {
      return parsed.tracks.map((item: any, idx: number) => ({
        name: String(item?.name || tracks[idx].name).trim(),
        artist: String(item?.artist || tracks[idx].artist)
          .replace(/ - Topic$/i, "")
          .trim(),
      }));
    }
    return tracks;
  } catch {
    return tracks;
  }
}

export async function convertPlaylistFromUrl(
  playlistUrl: string
): Promise<PlaylistConversionResult> {
  const platform = detectPlaylistPlatform(playlistUrl);
  if (!platform) {
    throw new Error(
      "Unsupported URL. Paste a public playlist link from Spotify, YouTube / YouTube Music, JioSaavn, or Apple Music."
    );
  }

  let imported: ImportedPlaylistInfo;
  switch (platform) {
    case "spotify":
      imported = await importSpotifyPlaylist(playlistUrl);
      break;
    case "youtube":
      imported = await importYouTubePlaylist(playlistUrl);
      break;
    case "jiosaavn":
      imported = await importJioSaavnPlaylist(playlistUrl);
      break;
    case "apple-music":
      imported = await importAppleMusicPlaylist(playlistUrl);
      break;
  }

  const cleanedTracks = await cleanTrackTitlesWithAI(
    imported.tracks,
    imported.platform
  );

  // Enrich in fast batches of 10 using lightweight JSON APIs
  const convertedTracks: ConvertedTrack[] = [];
  const batchSize = 10;
  for (let i = 0; i < cleanedTracks.length; i += batchSize) {
    const slice = cleanedTracks.slice(i, i + batchSize);
    const enrichedBatch = await Promise.all(
      slice.map(async (t) => {
        const meta = await enrichSongAcrossPlatforms(t.name, t.artist);
        return {
          name: t.name,
          artist: t.artist,
          ...meta,
        };
      })
    );
    convertedTracks.push(...enrichedBatch);
  }

  const videoIds = convertedTracks
    .map((t) => t.youtubeVideoId)
    .filter((id): id is string => Boolean(id));

  const ytPlaylistLinks = await generateYouTubePlaylistLinks(videoIds);

  const spotifyTrackUris = convertedTracks
    .map((t) =>
      t.spotifyTrackId ? `spotify:track:${t.spotifyTrackId}` : null
    )
    .filter((uri): uri is string => Boolean(uri));

  return {
    source: {
      platform: imported.platform,
      title: imported.title,
      coverUrl: imported.coverUrl,
      sourceUrl: imported.sourceUrl,
      totalFound: imported.totalFound,
      convertedCount: convertedTracks.length,
    },
    tracks: convertedTracks,
    youtubePlaylistUrl: ytPlaylistLinks.youtubePlaylistUrl,
    youtubeMusicPlaylistUrl: ytPlaylistLinks.youtubeMusicPlaylistUrl,
    youtubeQueueUrl: ytPlaylistLinks.youtubeQueueUrl,
    spotifyTrackUris,
  };
}
