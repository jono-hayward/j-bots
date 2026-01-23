import './config.js';

import { parse } from './helpers.js';
import { compose } from './compose.js';
import { process_artwork } from './artwork.js';
import { post } from './post.js';

import { getBluesky, getRedis } from './connections.js';
const redis = await getRedis();
const agent = await getBluesky();

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


/** Iterate through tracks */
for (const track of tracks.items) {

  const song = parse(track);

  if (song) {

    console.log(' ');
    console.log(`🎵  Processing "${song.title}" by ${song.artist}, played at ${song.started.toLocaleTimeString('en-AU', timeOptions)}`);
    song.artist_entity && console.log('🧑‍🎤  Artist entity: ', song.artist_entity);

    const postObject = await compose(song);

    if (song.artwork) {
      await process_artwork( song, postObject );
    } else {
      console.log('🪧  No artwork found');
    }
    
    await post( postObject );
  }
}

if (redis) {
  console.log('❌  Logging out of Redis');
  await redis.quit();
}

console.log('🏁  Finished run.');
await exit(0);