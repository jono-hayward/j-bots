import { getRedis } from './connections.js';
const redis = await getRedis();

const main = async () => {
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

    results.sort((a, b) => a.Artist.toLowerCase().replace('the ','').localeCompare(b.Artist.toLowerCase().replace('the ','')));

    console.table(results);

    await redis.quit();
    process.exit(0);
}

main();
