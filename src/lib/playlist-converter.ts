import "server-only";
import type {
  SourcePlatform,
  RawPlaylistTrack,
  ImportedPlaylistInfo,
  ConvertedTrack,
  PlaylistConversionResult,
} from "@/types/music";
import {
  enrichSongAcrossPlatforms,
  generateYouTubePlaylistLinks,
} from "@/lib/music-platforms";
import {
  getGroqClient,
  resolveGroqCandidateModels,
  extractJsonFromText,
  isRetriableGroqError,
} from "@/lib/groq";
import { BROWSER_USER_AGENT, decodeHtmlEntities } from "@/lib/utils";

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
    headers: { "User-Agent": BROWSER_USER_AGENT },
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
      name: decodeHtmlEntities(String(item?.title ?? "")),
      artist: decodeHtmlEntities(String(item?.subtitle ?? "")),
    }))
    .filter((t) => t.name.length > 0);

  if (tracks.length === 0) {
    throw new Error("No tracks found in this Spotify playlist.");
  }

  const coverUrl =
    entity?.coverArt?.sources?.[0]?.url ??
    entity?.images?.[0]?.url ??
    undefined;

  return {
    platform: "spotify",
    title: decodeHtmlEntities(entity?.name ?? entity?.title) || "Spotify Playlist",
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
  const videoIdParam = url.searchParams.get("v");

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
        "User-Agent": BROWSER_USER_AGENT,
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
    if (node.playlistPanelVideoRenderer) {
      items.push({ _panelVideo: node.playlistPanelVideoRenderer });
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

  if (res.ok) {
    const data = await res.json();
    walk(data);
  }

  // Fallback to youtubei/v1/next for generated queues (TLGG...) or Radio mixes (RD...)
  if (items.length === 0) {
    const nextRes = await fetch(
      "https://music.youtube.com/youtubei/v1/next?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://music.youtube.com",
          "User-Agent": BROWSER_USER_AGENT,
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
          playlistId: listId.replace(/^VL/, ""),
          ...(videoIdParam ? { videoId: videoIdParam } : {}),
        }),
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      }
    );

    if (nextRes.ok) {
      const nextData = await nextRes.json();
      walk(nextData);
    }
  }

  const tracks: RawPlaylistTrack[] = [];

  for (const item of items) {
    if (item._panelVideo) {
      const pv = item._panelVideo;
      const title = pv?.title?.runs?.[0]?.text ?? "";
      const artist = pv?.longBylineText?.runs?.[0]?.text ?? "";
      if (title) tracks.push({ name: title.trim(), artist: artist.trim() });
      continue;
    }
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
      "No tracks found in this YouTube playlist. Make sure it is a public or unlisted playlist."
    );
  }

  return {
    platform: "youtube",
    title: playlistTitle || "YouTube Music Playlist",
    coverUrl,
    sourceUrl: `https://music.youtube.com/playlist?list=${listId.replace(/^VL/, "")}`,
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

  const data = (await res.json()) as Record<string, any>;
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
        name: decodeHtmlEntities(item?.title),
        artist: decodeHtmlEntities(primaryArtists),
      };
    })
    .filter((t) => t.name.length > 0);

  const coverUrl =
    typeof data?.image === "string"
      ? data.image.replace("150x150", "500x500")
      : undefined;

  return {
    platform: "jiosaavn",
    title: decodeHtmlEntities(data?.title) || "JioSaavn Playlist",
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
    headers: { "User-Agent": BROWSER_USER_AGENT },
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
      decodeHtmlEntities(titleMatch?.[1]?.replace(/ on Apple Music$/i, "")) ||
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
  if (platform !== "youtube" || tracks.length === 0) return tracks;

  const needsCleaning = tracks.some((t) =>
    /[\[\(\|]|official|video|lyrics|audio|full song|slowed|reverb|ft\.|feat\./i.test(
      `${t.name} ${t.artist}`
    )
  );
  if (!needsCleaning) return tracks;

  try {
    const client = getGroqClient();
    const candidates = await resolveGroqCandidateModels(client);

    for (const model of candidates) {
      try {
        const response = await client.chat.completions.create({
          model,
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
        if (!raw) continue;

        const parsed = extractJsonFromText(raw) as Record<string, any>;
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
      } catch (err) {
        if (!isRetriableGroqError(err)) break;
      }
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
