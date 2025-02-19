import dotenv from 'dotenv';
import pkg from '@atproto/api';
const { BskyAgent } = pkg;

dotenv.config();
dotenv.config({ path: `.TRIPLEJ.env` });

const agent = new BskyAgent({ service: "https://bsky.social" });

export const resolve = async (handle) => {
    handle = handle.replace('@','');
    console.log(`Attempting to resolve @${handle}`);

    try {
        const did = await agent.resolveHandle({ handle });
        if (did.data) {
            return did?.data?.did;
        }
    } catch {
        console.error('Unable to resolve provided handle');
    }
    return false;
}

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
  if (result && result.validationStatus === 'valid')
      return true;
  }
  return false;
}
