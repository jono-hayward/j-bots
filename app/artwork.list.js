import { getRedis } from './connections.js';
const redis = await getRedis();

const main = async () => {
    console.log('Querying...');
    
    const keys = await redis.keys('artwork:*');

    const results = {};
    for (const k of keys) {
        const a = await redis.hGetAll(k);
        results[k.replace('artwork:','')] = {
            'Alt': a.alt.substring(0,50),
            'Adult': a.adult,
            'Graphic': a.graphic,
        };
    }

    console.table(results);

    await redis.quit();
    process.exit(0);
}

main();
