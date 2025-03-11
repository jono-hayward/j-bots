import './config.js';
import { getRedis } from './connections.js';
const redis = await getRedis();

import { input, select, confirm } from '@inquirer/prompts';
import { parse } from './helpers.js';

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

    let alt;
    try {
        alt = await input({ message: 'Alt text:' });
    } catch {
        // User exited
        process.exit(0);
    }
    
    let adult;
    try {
        adult = await select({
            message: 'Adult content:',
            choices: [
                {
                    name: 'None',
                    value: false,
                },
                {
                    name: 'Sexually suggestive',
                    value: 'sexual',
                },
                {
                    name: 'Non-sexual nudity',
                    value: 'nudity',
                },
                {
                    name: 'Porn',
                    value: 'porn',
                },
            ],
        });
    } catch {
        // User exited
        process.exit(0);
    }

    let graphic;
    try {
      graphic = await confirm({
        message: 'Contains graphic media:',
        default: false,
      });
    } catch {
        // User exited
        process.exit(0);
    };

    const send = await redis.hSet(`artwork:${song.artwork.arid}`, {
        alt,
        adult: JSON.stringify(adult),
        graphic: JSON.stringify(graphic),
    });

    if (send < 0) {
        console.error('Failed to add artwork to meta registry');
        process.exit(1);
    }
    console.log('✔️ Artwork meta added');

    console.log('✔️ Done!');
    
    if (redis) {
        console.log('❌  Logging out of Redis');
        await redis.quit();
    }
    process.exit(0);
}

main();