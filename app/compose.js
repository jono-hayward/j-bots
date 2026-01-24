import "./config.js";
import { getRedis } from "./connections.js";
const redis = await getRedis();

import {
  searchAppleMusic,
  searchGenius,
  searchSpotify,
  searchYouTube,
  clockEmoji,
  addFacet,
} from "./helpers.js";

const TWELVEHOURS = 12 * 60 * 60 * 1000;

const hottestDates = {
  triplej: [
    {
      title: "Triple J's Hottest 100 of 2025",
      start: new Date("2026-01-24T12:00:00+11:00"),
    },
  ],
  doublej: [
    {
      title: "Double J's Hottest 100 of 2005",
      start: new Date("2026-01-25T12:00:00+11:00"),
    },
  ],
};

/**
 * Compose the bluesky post based on a song
 * @param {*} song
 */
export const compose = async (song) => {
  const timeOptions = {
    timeStyle: "short",
    timeZone: process.env.TIMEZONE,
  };

  const lines = [];

  // Begin our bluesky post
  const postObject = {
    langs: ["en-AU", "en"],
    createdAt: song.started.toISOString(),
    facets: [],
  };

  // Used during Hottest 100
  if (song.count && song.count > 0) {
    console.log("Track count found!");
    const now = new Date();
    // Find a matching countdown period - from the known start date to +12 hours.
    const countdown = hottestDates[process.env.STATION.toLowerCase()]?.find(
      (date) => {
        const end = new Date(date.start.getTime() + TWELVEHOURS);
        return now >= date.start && now <= end;
      },
    );
    if (countdown) {
      console.log(`We're in the Hottest 100 period for ${countdown.title}`);
      lines.push(`🥁 ${countdown.title}: #${song.count}`, `#Hottest100`, ``);
    } else {
      console.log("No matching countdown found");
    }
  }

  lines.push(
    `#NowPlaying`,
    `${clockEmoji(process.env.TIMEZONE, song.started)} ${song.started.toLocaleTimeString("en-AU", timeOptions)}`,
    ``,
    `🎵 ${song.title}`,
    `🧑‍🎤 ${song.artist}`,
  );

  // If the album and the song title are the same it's usually a single, and it looks weird
  if (song.album && song.album !== song.title) {
    lines.push(`💿 ${song.album}`);
  }

  song.unearthed && lines.push(``, `🌱 Triple J Unearthed`);

  // Search the music streaming services for our song
  const streamingLinks = [];
  console.log("🔍  Searching streaming services...");

  const appleMusic = await searchAppleMusic(song);
  appleMusic &&
    streamingLinks.push({
      service: "Apple Music",
      url: appleMusic,
    }) &&
    console.log("✅  Found song on Apple Music");

  const spotify = await searchSpotify(song);
  spotify &&
    streamingLinks.push({
      service: "Spotify",
      url: spotify,
    }) &&
    console.log("✅  Found song on Spotify");

  const yt = await searchYouTube(song);
  yt &&
    streamingLinks.push({
      service: "YouTube Music",
      url: yt,
    }) &&
    console.log("✅  Found song on YouTube Music");

  // Add found streaming services to the post
  streamingLinks.length &&
    lines.push(
      ``,
      `🎧 ${streamingLinks.map((service) => service.service).join(" / ")}`,
    );

  // Look for lyrics
  const genius = await searchGenius(song);
  genius &&
    lines.push(``, `📝 Lyrics`) &&
    console.log("✅  Found lyrics on Genius");

  // Put the post together
  postObject.text = lines.join("\n");

  addFacet(postObject, "tag", "#NowPlaying", "#NowPlaying");
  addFacet(postObject, "tag", "#Hottest100", "#Hottest100");
  addFacet(postObject, "tag", "#AusHottest100", "#AusHottest100");

  if (redis) {
    // Search for the artist in our bluesky links file
    console.log("🦋  Searching for saved Bluesky profiles...");

    const did = await redis.hGet(`artist:${song.artist_entity}`, "did");
    if (did) {
      console.log("✅  Bluesky profile found, adding mention to post.");
      addFacet(postObject, "mention", song.artist, did);
    }
  }

  // Add the link facets to the post
  for (const stream of streamingLinks) {
    addFacet(postObject, "link", stream.service, stream.url);
  }

  // Add unearthed link
  song.unearthed &&
    addFacet(postObject, "link", "Triple J Unearthed", song.unearthed);

  // Add Genius link
  genius && addFacet(postObject, "link", "Lyrics", genius);

  return postObject;
};
