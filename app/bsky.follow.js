import dotenv from 'dotenv';

import pkg from '@atproto/api';
const { BskyAgent } = pkg;

// Load global config
dotenv.config();
// Load station-specific config
dotenv.config({ path: `.TRIPLEJ.env` });

export const follow = async (did) => {
  if (!did) {
    console.error('No Bluesky DID provided');
    return false;
  }
  const agent = new BskyAgent({ service: "https://bsky.social" });
  await agent.login({
    identifier: process.env.BSKY_USERNAME,
    password: process.env.BSKY_PASSWORD,
  });

  const result = await agent.follow(did);
  console.log(result);

  return true;
}
