import 'dotenv/config';

import SpotifyWebApi from "spotify-web-api-node";
import YouTubeMusicAPI from "youtube-music-api";

export const parse = (song) => {
  const { played_time, recording, release, count } = song;
  const artist = release?.artists?.[0];

  if (played_time && recording.title && artist) {
    const result = {
      started: new Date(played_time),
      title: recording.title,
      artist: artist?.name,
      artist_entity: artist?.arid,
      album: release?.title,
      artwork: recording.releases?.[0]?.artwork?.[0] || release?.artwork?.[0] || release?.artists?.[0]?.artwork?.[0],
      artwork_aspect: release?.artwork?.[0] ? '1x1' : '16x9',
      count: count || null,
    };

    if (artist?.links?.length) {
      const link = artist.links[0];
      if (link.service_id === "unearthed" && link.url.startsWith('https:')) {
        result.unearthed = link.url;
      }
    }

    return result;
  } else {
    console.error("⚠️  Failed to parse song", song);
  }
  return false;
};

const getImg = (art) => {
  if (art.sizes && art.sizes.length) {
    let largest;

    for (const img of art.sizes) {
      largest =
        img.aspect_ratio === "1x1" && img.width <= 1000 ? img.url : largest;
    }

    return largest;
  } else if (art.url) {
    return art.url;
  }

  return false;
};

const findByteRange = (largerString, substring) => {
  const encoder = new TextEncoder();
  const largerStringBytes = encoder.encode(largerString);
  const substringBytes = encoder.encode(substring);

  let start = -1;
  let end = -1;
  let currentIndex = 0;

  for (let i = 0; i < largerStringBytes.length; i++) {
    if (largerStringBytes[i] === substringBytes[currentIndex]) {
      if (currentIndex === 0) {
        start = i;
      }
      currentIndex++;
      if (currentIndex === substringBytes.length) {
        end = i + 1;
        break;
      }
    } else if (currentIndex > 0) {
      // If substring match was broken, reset currentIndex
      currentIndex = 0;
    }
  }

  return { start, end };
};

const sanitise_song = (song) => song.replace("ft. ", "");

export const searchAppleMusic = async (song, debug = false) => {
  const base = "https://itunes.apple.com/search";

  const params = new URLSearchParams({
    limit: 1,
    country: "AU",
    media: "music",
    entity: "musicTrack",
    term: `${sanitise_song(song.title)} ${song.artist}`,
  });

  const url = `${base}?${params.toString()}`;

  debug && console.log("Querying", url);

  try {
    const response = await fetch(url);
    if (response.ok) {
      const results = await response.json();
      debug && console.log("Raw Apple Music results", results);
  
      if (
        results.resultCount &&
        results.results[0].artistName.toLowerCase() === song.artist.toLowerCase() &&
        results.results[0].trackName.toLowerCase().includes(song.title.toLowerCase())
      ) {
        return results.results[0].trackViewUrl;
      }
    } else {
      console.error("⚠️  Failed to search Apple music", response);
    }
  } catch (err) {
    console.error('There was an error fetching Apple Nusic results', err);
  }

  return false;
};

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT,
  clientSecret: process.env.SPOTIFY_SECRET,
});

let spotifyAccessToken = null;

const getSpotifyAccessToken = async () => {
  if (!spotifyAccessToken) {
    try {
      const data = await spotifyApi.clientCredentialsGrant();
      spotifyAccessToken = data.body["access_token"];
      spotifyApi.setAccessToken(spotifyAccessToken);
    } catch (err) {
      console.error("🛑  Error retrieving Spotify access token", err);
    }
  }
};

export const searchSpotify = async (song, debug = false) => {
  await getSpotifyAccessToken();

  try {
    const result = await spotifyApi.searchTracks(
      `track:${sanitise_song(song.title)} artist:${song.artist}`,
      {
        limit: 1,
        country: "AU",
        type: "track",
      }
    );

    debug && console.log("Raw Spotify results", result?.body?.tracks?.items);

    if (
      result?.body?.tracks?.total &&
      result.body.tracks.items[0].artists[0].name.toLowerCase() === song.artist.toLowerCase() &&
      result.body.tracks.items[0].name.toLowerCase().includes(song.title.toLowerCase())
    ) {
      return result.body.tracks.items[0].external_urls.spotify;
    }
  } catch (err) {
    console.error("🛑  Error searching Spotify", err);
  }

  return false;
};

export const searchYouTube = async (song, debug = false) => {
  const yt = new YouTubeMusicAPI();
  await yt.initalize();
  yt.ytcfg.VISITOR_DATA = "";

  try {
    const result = await yt.search(
      `${sanitise_song(song.title)} ${song.artist}`,
      "song"
    );

    debug && console.log("Raw YouTube Music results", result?.content);

    if (
      result?.content?.length &&
      result.content[0].artist.name.toLowerCase() === song.artist.toLowerCase() &&
      result.content[0].name.toLowerCase().includes(song.title.toLowerCase())
    ) {
      return `https://music.youtube.com/watch?v=${result.content[0].videoId}`;
    }
  } catch (err) {
    console.error("🛑  Error searching YouTube", err);
  }

  return false;
};

export const clockEmoji = (timezone, time) => {
  const options = { timeZone: timezone };
  const timeString = new Date(time).toLocaleTimeString("en-AU", options);
  const [hours, minutes] = timeString.split(":");
  const closestHalfHour = Math.floor((minutes / 60) * 2) / 2;
  const currentTime = parseInt(hours) + closestHalfHour;

  const emojiMap = {
    0: "🕛",
    0.5: "🕧",
    1: "🕐",
    1.5: "🕜",
    2: "🕑",
    2.5: "🕝",
    3: "🕒",
    3.5: "🕞",
    4: "🕓",
    4.5: "🕟",
    5: "🕔",
    5.5: "🕠",
    6: "🕕",
    6.5: "🕡",
    7: "🕖",
    7.5: "🕢",
    8: "🕗",
    8.5: "🕣",
    9: "🕘",
    9.5: "🕤",
    10: "🕙",
    10.5: "🕥",
    11: "🕚",
    11.5: "🕦",
    12: "🕛",
  };

  return emojiMap[currentTime] || "🕜";
};

export const addFacet = (postObject, type, search, value) => {
  const { start, end } = findByteRange(postObject.text, search);

  if (start === -1 || end === -1) {
    return false;
  }

  let feature = null;

  switch(type) {
    case 'link':
      feature = {
        $type: "app.bsky.richtext.facet#link",
        uri: value,
      };
      break;
    case 'mention':
      feature = {
        $type: "app.bsky.richtext.facet#mention",
        did: value,
      };
      break;
    case 'tag':
      feature = {
        $type: 'app.bsky.richtext.facet#tag',
        tag: value.replace(/^#/, ''),
      };
      break;
    default: 
      return false;
  }

  postObject.facets.push({
    index: {
      byteStart: start,
      byteEnd: end,
    },
    features: [
      feature
    ],
  });

  return true;
}

export const searchGenius = async (song, debug = false) => {
  const base = "https://api.genius.com/search";

  const params = new URLSearchParams({
    q: `${sanitise_song(song.title)} ${song.artist}`,
  });

  const url = `${base}?${params.toString()}`;

  debug && console.log("Querying", url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GENIUS_TOKEN}`,
    },
  });

  if (response.ok) {
    const results = await response.json();
    debug && console.log("Raw Genius results", results);

    if (results?.response?.hits?.length) {
      const res = results.response.hits[0].result;
      if (
        res.primary_artist_names.toLowerCase() === song.artist.toLowerCase() &&
        res.title.toLowerCase().includes(song.title.toLowerCase())
      ) {
        return results.response.hits[0].result.url;
      }
    }
  } else {
    console.error("⚠️  Failed to search Genius", response);
  }

  return false;
}
