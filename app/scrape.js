import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';

import { createClient } from 'redis';

import { parse } from './helpers.js';
import { compose } from './compose.js';

import pkg from '@atproto/api';
const { BskyAgent } = pkg;

// Load global config
dotenv.config();
// Load station-specific config
if (!process.env.STATION) {
  console.error('🚫  No station specified.');
  process.exit(1);
}
dotenv.config({ path: `.${process.env.STATION}.env` });

const timeOptions = {
  timeStyle: 'short',
  timeZone: process.env.TIMEZONE,
};

const now = new Date();
console.log(`📻  ${process.env.STATION}`);
console.log(`🚀  Starting run at ${now.toLocaleTimeString('en-AU', timeOptions)}`);
console.log(``);

// Begin talking to Bluesky
console.log('🪵  Logging in to Bluesky');
const agent = new BskyAgent({ service: "https://bsky.social" });
await agent.login({
  identifier: process.env.BSKY_USERNAME,
  password: process.env.BSKY_PASSWORD,
});

// Get latest post date
console.log('🔍  Finding the time of the most recent post');
let feed;
try {
  feed = await agent.getAuthorFeed({
    actor: process.env.BSKY_HANDLE,
    filter: 'posts_no_replies',
    limit: 10,
  });
} catch (err) {
  console.error('⛔ Failed to get latest Bluesky post: ', err);
  process.exit(1);
}

let latest;
if (feed?.data?.feed?.length) {

  // Filter out posts that begin with 🤖, which we're using for service updates
  const posts = feed.data.feed.filter(entry => !entry.post.record.text.startsWith('🤖'));
  latest = new Date(posts[0].post.record.createdAt);

  /* Doing the API query based on the exact time of the post seems to result in a possible duplicate
   * Just offsetting by a few seconds should get around that */
  latest.setSeconds(latest.getSeconds() + 10);

  console.log(`⌚️  Latest post was at ${latest.toLocaleTimeString('en-AU', timeOptions)}`);

} else {

  console.log('⌚️  No previous post found, searching from the last twenty minutes');

  latest = new Date();
  latest.setMinutes(latest.getMinutes() - 20);

}

// Query the ABC API
const params = new URLSearchParams({
  station: process.env.STATION,
  tz: process.env.TIMEZONE,
  from: latest.toISOString().replace('Z', '+00:00:00'), // Turn the ISO string into something the ABC API will accept
  limit: 20,
  order: 'desc', // We want them in descending order to always get the latest, even if for some reason there's more results than our limit
});

const API = `https://music.abcradio.net.au/api/v1/plays/search.json?${params.toString()}`;

const scrape = async () => fetch(API).then(response => response.json());
const tracks = await scrape();

if (!tracks.total) {
  console.log('⛔  No new plays since last post.');
  console.log('');
  console.log('🏁  Finished early.');
  process.exit(0);
}

/**
 * Sort the items into ascending order, so we post from oldest to most recent.
 * Technically since we're setting the createdAt attribute to the played time anyway,
 * this shouldn't matter. But it feels neater to do it this way?
 */
tracks.items.sort((a, b) => new Date(a.played_time) - new Date(b.played_time));

let redis = null;
if (process.env.REDIS_URL) {
  console.log('🛜  Connecting to redis');
  redis =  await createClient({ url: process.env.REDIS_URL }).connect();
}

/** Iterate through tracks */
for (const track of tracks.items) {

  const song = parse(track);

  if (song) {

    console.log(' ');
    console.log(`🎵  Processing "${song.title}" by ${song.artist}, played at ${song.started.toLocaleTimeString('en-AU', timeOptions)}`);
    song.artist_entity && console.log('🧑‍🎤  Artist entity: ', song.artist_entity);

    const postObject = await compose(song, redis);

    if (song.artwork) {

      console.log(' ');
      console.log('🖼️  Processing artwork');

      try {
        const response = await fetch(song.artwork);
        const buffer = await response.arrayBuffer();

        // An API error stated the maximum file size as 976.56kb
        if (buffer.byteLength < 976560) {
          console.log('⬆️  Uploading artwork to Bluesky...');
          const { data } = await agent.uploadBlob(new Uint8Array(buffer), { encoding: 'image/jpeg' });
          console.log('✅  Uploaded!');

          postObject.embed = {
            $type: 'app.bsky.embed.images',
            images: [{
              alt: `Album artwork for "${song.album}" by ${song.artist}`,
              image: data.blob,
              aspectRatio: {
                width: 1,
                height: 1,
              }
            }]
          };
        }
      } catch (err) {
        console.error('❌  Image processing failed. Skipping...');
        console.error('Error:', err);
      }
    }

    console.log('');
    console.log('✉️  Posting to Bluesky', postObject);
    try {
      await agent.post(postObject);
      console.log('☑️  Done!');
    } catch (err) {
      console.error('⛔  Failed to post to Bluesky: ', err);
      postObject.error = err;
      const logDir = path.join('./log/failed-posts');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
      }
      const logFileName = `${process.env.STATION}.${song.started.toISOString().replace(/[:.]/g, '-')}.json`;
      const logFilePath = path.join(logDir, logFileName);
      fs.writeFileSync(logFilePath, JSON.stringify(postObject, null, 2), 'utf8');
    }
  }

  console.log(' ');

}

if (process.env.REDIS_URL) {
  console.log('❌  Logging out of Redis');
  await redis.quit();
}

console.log('🏁  Finished run.');
process.exit(0);