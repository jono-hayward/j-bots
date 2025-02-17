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