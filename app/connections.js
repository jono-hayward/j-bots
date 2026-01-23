import './config.js';

import pkg from '@atproto/api';
const { BskyAgent } = pkg;

import { createClient } from 'redis';

let agent = null;
let redis = null;

export async function getBluesky() {
  if (agent) return agent;

  const redis = await getRedis();
  const SESSION_KEY = `bluesky:${process.env.BSKY_HANDLE}:session`;

  agent = new BskyAgent({ service: 'https://bsky.social' });

  try {
    const sessionJson = await redis.get(SESSION_KEY);
    if (sessionJson) {
      const session = JSON.parse(sessionJson);
      try {
        await agent.resumeSession(session);
        console.log('✅  Resumed Bluesky session from Redis');
        return agent;
      } catch (resumeErr) {
        console.warn('⚠️  Failed to resume session, falling back to login:', resumeErr);
      }
    } else {
      console.log('🪵  No session in Redis — logging in to Bluesky');
    }

    // Either no session or resume failed — try fresh login
    await agent.login({
      identifier: process.env.BSKY_USERNAME,
      password: process.env.BSKY_PASSWORD,
    });
    await redis.set(SESSION_KEY, JSON.stringify(agent.session));
    console.log('✅  Logged in and saved session to Redis');
    return agent;
  } catch (err) {
    console.error('⛔ Failed to create Bluesky session:', err);
    throw err;
  }
}

export async function getRedis() {
  if (!redis && process.env.REDIS_URL) {
    try {
      console.log('🛜  Connecting to redis');
      redis = createClient({ url: process.env.REDIS_URL });
      await redis.connect();
      console.log('✳️  Connected.');
    } catch (err) {
      console.error('⛔ Failed to connect to redis:', err);
      throw err;
    }
  }
  return redis;
}