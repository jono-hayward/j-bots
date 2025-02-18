import 'dotenv/config';

import { select, confirm } from '@inquirer/prompts';

import { createClient } from 'redis';

const main = async () => {
    const redis =  await createClient({ url: process.env.REDIS_URL }).connect();
    const keys = await redis.keys('artist:*');

    console.log('Getting list of artists...');

    const choices = [];
    for (const k of keys) {
        const a = await redis.hGetAll(k);
        choices.push({
            name: a.artist,
            value: k,
        });
    }

    choices.sort((a, b) => a.name.localeCompare(b.name));

    const artist = await select({
        message: 'Choose a artist:',
        choices,
    });

    const confirmation = await confirm({
        message: 'Are you sure you want to delete this artist?'
    });

    if (confirmation) {
        await redis.del(artist);
    }

    await redis.quit();
    process.exit(0);
}

main();