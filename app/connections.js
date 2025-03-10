import './config.js';

import pkg from '@atproto/api';
const { BskyAgent } = pkg;

import { createClient } from 'redis';

// Begin talking to Bluesky
console.log('🪵  Logging in to Bluesky');
const agent = new BskyAgent({ service: "https://bsky.social" });
await agent.login({
  identifier: process.env.BSKY_USERNAME,
  password: process.env.BSKY_PASSWORD,
});

// Begin redit connection
let redis = null;
if (process.env.REDIS_URL) {
  console.log('🛜  Connecting to redis');
  redis =  await createClient({ url: process.env.REDIS_URL }).connect();
}


export { agent, redis };