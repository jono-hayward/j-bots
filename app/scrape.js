import './config.js';
import fs from 'fs';
import path from 'path';

import { parse } from './helpers.js';
import { compose } from './compose.js';
import { process_artwork } from './artwork.js';

import { agent, redis } from './connections.js';

const now = new Date();
const timeOptions = {
  timeStyle: 'short',
  timeZone: process.env.TIMEZONE,
};

console.log(``);
console.log(`🚀  Starting run at ${now.toLocaleTimeString('en-AU', timeOptions)}`);
console.log(``);


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
  await exit(1);
}

const exit = async (status) => {
  if (process.env.HB_PING) {
    console.log(`🏓  Pinging health check with ${ status === 1 ? 'failure' : 'success' } status.`)
    await fetch(`${process.env.HB_PING}/${status}`);
    console.log('☑️  Done.')
  }
  process.exit(status);
}

let latest;
if (feed?.data?.feed?.length) {

  // Filter out posts that begin with 🤖, which we're using for service updates
  const posts = feed.data.feed.filter(entry => !entry.post.record.text.startsWith('🤖'));
  latest = new Date(posts[0].post.record.createdAt);

  /**
   * Doing the API query based on the exact time of the post seems to result in a possible duplicate
   * Just offsetting by a few seconds should get around that
   */
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
  limit: 30,
  order: 'asc',
});

const API = `https://music.abcradio.net.au/api/v1/plays/search.json?${params.toString()}`;

const scrape = async () => fetch(API).then(response => response.json());
const tracks = await scrape();

if (!tracks.total) {
  console.log('⛔  No new plays since last post.');
  console.log('');
  console.log('🏁  Finished early.');
  await exit(0);
}

/**
 * Sort the items into ascending order, so we post from oldest to most recent.
 * Technically since we're setting the createdAt attribute to the played time anyway,
 * this shouldn't matter. But it feels neater to do it this way?
 */
tracks.items.sort((a, b) => new Date(a.played_time) - new Date(b.played_time));


/** Iterate through tracks */
for (const track of tracks.items) {

  const song = parse(track);

  if (song) {

    console.log(' ');
    console.log(`🎵  Processing "${song.title}" by ${song.artist}, played at ${song.started.toLocaleTimeString('en-AU', timeOptions)}`);
    song.artist_entity && console.log('🧑‍🎤  Artist entity: ', song.artist_entity);

    const postObject = await compose(song, redis);

    if (song.artwork) {
      await process_artwork( song, postObject );
    } else {
      console.log('🪧  No artwork found');
    }
    
    console.log('');
    console.log('✉️  Posting to Bluesky', postObject);
    let success;
    try {
      await agent.post(postObject);
      console.log('☑️  Done!');
      success = true;
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
      if (process.env.HB_POST) {
	      // Post failure to heartbeat monitor
        await fetch(`${process.env.HB_POST}/1`);
      }
    }

    if (process.env.HB_POST && success) {
      // Post success to heartbeat monitor
      console.log(`🏓  Pinging post check with success status.`);
      try {
        await fetch(`${process.env.HB_POST}/0`, {
          signal: AbortSignal.timeout(2000),
        });
      } catch (err) {
        console.error('Failed to ping post status', err);
      }
    }
  }

  console.log(' ');

}

if (process.env.REDIS_URL) {
  console.log('❌  Logging out of Redis');
  await redis.quit();
}

console.log('🏁  Finished run.');
await exit(0);