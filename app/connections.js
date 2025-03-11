import './config.js';

import pkg from '@atproto/api';
const { BskyAgent } = pkg;

import { createClient } from 'redis';

let agent = null;
let redis = null;

export async function getBluesky() {
  if (!agent) {
    console.log('🪵  Logging in to Bluesky');
    agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({
      identifier: process.env.BSKY_USERNAME,
      password: process.env.BSKY_PASSWORD,
    });
  }
  return agent;
}

export async function getRedis() {
  if (!redis && process.env.REDIS_URL) {
    console.log('🛜  Connecting to redis');
    redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
  }
  return redis;
}