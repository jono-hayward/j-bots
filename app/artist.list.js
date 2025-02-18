import 'dotenv/config';

import { createClient } from 'redis';

const main = async () => {
    const redis =  await createClient({ url: process.env.REDIS_URL }).connect();
    const keys = await redis.keys('artist:*');

    console.log('Querying...');

    const results = [];
    for (const k of keys) {
        const a = await redis.hGetAll(k);
        results.push({
            'Artist': a.artist,
            'Entity': k.replace('artist:',''),
            'Bluesky DID': a.did,
        });
    }

    results.sort((a, b) => a.Artist.localeCompare(b.Artist));

    console.table(results);

    await redis.quit();
    process.exit(0);
}

main();