import 'dotenv/config';

import { createClient } from 'redis';

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

import { resolve } from './resolve.js';

const rl = readline.createInterface({ input, output });

const artist = await rl.question('Artist name: ');
const entity = await rl.question('ABC artist entity ID: ');
const handle = await rl.question('Bluesky handle: ');
rl.close();

if (artist && entity && handle) {
    const did = await resolve(handle);
    if (!did) {
        console.error('Unable to resolve handle');
        process.exit(0);
    }
    const redis =  await createClient({ url: process.env.REDIS_URL }).connect();
    const send = await redis.hSet(`artist:${entity}`, {
        artist,
        did
    });
    console.log('Send result', send);
    await redis.quit();
    process.exit(0);
}
