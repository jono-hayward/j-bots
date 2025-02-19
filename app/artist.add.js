import 'dotenv/config';

import { createClient } from 'redis';
import { input, select, confirm } from '@inquirer/prompts';
import { resolve, follow } from './bluesky.js';
import { parse } from './helpers.js';

const main = async () => {
    const today = new Date();
    const defaultDate = today.toISOString().split('T')[0];
    
    try {
        const station = await select({
            message: 'Select a station:',
            choices: [
                {
                    name: 'Triple J',
                    value: 'triplej',
                },
                {
                    name: 'Double J',
                    value: 'doublej',
                },
            ],
        });

        const date = await input({
            message: 'Play date (yyyy-mm-dd):',
            default: defaultDate,
        });
        const time = await input({ message: 'Play time (hh:mm):' });
    } catch {
        // User exited
        process.exit(0);
    }

    const playDate = new Date(`${date} ${time}`);

    playDate.setMinutes(playDate.getMinutes() - 5);

    const params = new URLSearchParams( {
        station,
        order: 'asc',
        tz: process.env.TIMEZONE,
        limit: 5,
        from: playDate.toISOString().replace('Z', '+00:00:00'), // Turn the ISO string into something the ABC API will accept
    } );
      
    const API = `https://music.abcradio.net.au/api/v1/plays/search.json?${params.toString()}`;
    const scrape = async () => fetch( API ).then( response => response.json() );
    console.log('Querying ABC API for tracks');
    const tracks = await scrape();
    let song;
    if (tracks?.items?.length) {
        const choices = [];
        for (const track of tracks.items) {
            const song = parse(track);
            choices.push({
                name: `"${song.title}" by ${song.artist}`,
                value: song,
            });
        }
        try {
            song = await select({
                message: 'Select a play:',
                choices,
            });
        } catch {
            // User exited
            process.exit(0);
        }
        if (!song) {
            console.log('No song selected');
            process.exit(0);
        }
    } else {
        console.error('No songs found for provided date and time');
        process.exit(0);
    }

    try {
        const handle = await input({ message: 'Bluesky handle:' });
    } catch {
        // User exited
        process.exit(0);
    }
    const did = await resolve(handle);

    if (!did) {
        console.error('Unable to resolve handle');
        process.exit(0);
    }

    const redis =  await createClient({ url: process.env.REDIS_URL }).connect();
    const send = await redis.hSet(`artist:${song.artist_entity}`, {
        artist: song.artist,
        did
    });

    if (send < 0) {
        console.error('Failed to add artist to tag registry');
        process.exit(1);
    }
    console.log('✔️ Artist tagging set up');

    try {
        if (await confirm({ message: 'Follow artist on Bluesky?' })) {
            await follow(did);
        }
    } catch {
        // User exited
        process.exit(0);
    }

    console.log('✔️ Done!');
    
    await redis.quit();
    process.exit(0);
}

main();
