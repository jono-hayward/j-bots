import { getRedis } from './connections.js';
const redis = await getRedis();

import { input, select, confirm } from '@inquirer/prompts';
import { resolve, follow } from './bluesky.js';
import { parse } from './helpers.js';
import { compose } from './compose.js';
import { post } from './post.js';
import { process_artwork } from './artwork.js';

const main = async () => {
    
    let station, date, time;

    try {
        station = await select({
            message: 'Select station:',
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
    } catch {
        // user exited
        process.exit(0);
    }

    process.env.STATION = station.toUpperCase();
    await import('./config.js');

    const formatTime = (time) => {
        if (/^\d{4}$/.test(time)) {
            return `${time.slice(0,2)}:${time.slice(2)}`;
        }
        if (/^\d{3}$/.test(time)) {
            return `${time.slice(0,1)}:${time.slice(1)}`;
        }
        return time;
    }

    try {
        date = await input({
            message: 'Play date (yyyy-mm-dd):',
            default: new Date().toLocaleDateString('en-CA'),
        });
        time = await input({
            message: 'Play time (hh:mm):',
            transformer: formatTime,
        });
        time = formatTime(time);
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

    let handle;
    try {
        handle = await input({ message: 'Bluesky handle:' });
    } catch {
        // User exited
        process.exit(0);
    }
    const did = await resolve(handle);

    if (!did) {
        console.error('Unable to resolve handle');
        process.exit(0);
    }

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

    // try {
    //     if (await confirm({ message: 'Backdate post with tag?' })) {
    //         const postObject = await compose(song);
    //         console.log('Art?');
    //         if (song.artwork) {
    //             console.log('Art!');
    //             await process_artwork( song, postObject );
    //         } else {
    //             console.log('No art :(');
    //             console.log('🪧  No artwork found');
    //         }
    //         console.log('Posting...');
    //         await post( postObject );
    //     }
    // } catch {
    //     // User exited
    //     process.exit(0);
    // }

    console.log('✔️ Done!');
    
    if (redis) {
        console.log('❌  Logging out of Redis');
        await redis.quit();
    }
    process.exit(0);
}

main();