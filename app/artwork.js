import './config.js';

import { getBluesky, getRedis } from './connections.js';
const agent = await getBluesky();
const redis = await getRedis();

const SIZE_LIMIT = 1000000;

export const process_artwork = async ( song, postObject ) => {

    console.log(' ');
    console.log('🖼️  Processing artwork');

    /**
     * Find the largest version of the artwork that
     * doesn't go over Bluesky's 1mb limit
     */
    let art;
    if (song.artwork.url) {
        // Check the full quality upload
        console.log('Checking file size of', song.artwork.url);
        const size = await getImageSize(song.artwork?.url);
        if (size && size <= SIZE_LIMIT) {
            art = song.artwork;
        }
    }
    if (!art && song.artwork?.sizes?.length) {
        // Check the resized artworks
        song.artwork.sizes = song.artwork.sizes
            .filter((s) => s.aspect_ratio === song.artwork_aspect)
            .sort((a, b) => b.width - a.width);
    
        for (const s of song.artwork.sizes) {
            console.log('Checking file size of', s.url);
            const size = await getImageSize(s.url);
            if (size && size <= SIZE_LIMIT) {
                art = s;
                break;
            }
        }
    } 
    if (!art) {
        console.log('🪧  No artwork found.');
        return false;
    }

    // Set up default alt text
    const imageObject = {
        alt: `Album artwork for "${song.album}" by ${song.artist}`,
    };

    if (redis) {
        // Search for the artist in our bluesky links file
        console.log( '🔍  Searching for saved artwork entries...' );
        
        const meta = await redis.hGetAll(`artwork:${song.artwork.arid}`);
        if (Object.keys(meta).length) {
            console.log('✅  Artwork meta found, adding to image.');
            imageObject.alt = `${imageObject.alt}:\n\n${meta.alt}`;

            const labels = [];

            if (meta.adult !== 'false') {
                labels.push({ val: meta.adult });
            }
            if (meta.graphic === 'true') {
                labels.push({ val: 'graphic-media' });
            }

            if (labels.length) {
                postObject.labels = {
                    $type: 'com.atproto.label.defs#selfLabels',
                    values: labels
                };
            }
        }
    }

    /**
     * Upload the art
     */

    try {
        console.log('Downloading artwork', art.url);
        const response = await fetch(art.url);
        const buffer = await response.arrayBuffer();

        // Double check the size limit
        if (buffer.byteLength < SIZE_LIMIT) {
            console.log('⬆️  Uploading artwork to Bluesky...');
            const { data } = await agent.uploadBlob(new Uint8Array(buffer), { encoding: 'image/jpeg' });
            console.log('✅  Uploaded!');

            imageObject.image = data.blob;
            imageObject.aspectRatio = {
                width: art.width || 1,
                height: art.height || 1,
            };

            postObject.embed = {
                $type: 'app.bsky.embed.images',
                images: [imageObject]
            };
        }
    } catch (err) {
        console.error('❌  Image processing failed. Skipping...');
        console.error('Error:', err);
    }
}

/**
 * Get the size of any image using fetch()
 * @param {string} url The URL of the image to get the size of
 * @returns The image size in bytes
 */
export const getImageSize = async (url) => {
    const response = await fetch(url, { method: 'HEAD' });
  
    if (!response.ok) {
      return false;
    }
  
    const contentLength = response.headers.get('content-length');
    
    if (contentLength) {
      return parseInt(contentLength, 10);
    } else {
      return false;
    }
}