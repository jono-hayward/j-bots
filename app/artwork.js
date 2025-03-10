import './config.js';
import { agent } from './connections.js';

const SIZE_LIMIT = 1000000;

export const process_artwork = async ( song, postObject ) => {

    console.log(' ');
    console.log('🖼️  Processing artwork');

    /**
     * Find the largest version of the artwork that
     * doesn't go over Bluesky's 1mb limit
     */
    let art;
    if (song.artwork?.sizes?.length) {
        song.artwork.sizes = song.artwork.sizes
            .filter((s) => s.aspect_ratio === song.artwork_aspect)
            .sort((a, b) => b.width - a.width);
    
        for (const s of song.artwork.sizes) {
            const size = await getImageSize(s.url);
            if (size <= SIZE_LIMIT) {
                art = s;
                break;
            }
        }
    }
    if (!art) {
        console.log('🪧  No artwork found.');
        return false;
    }

    /**
     * Upload the art
     */

    try {
        const response = await fetch(art.url);
        const buffer = await response.arrayBuffer();

        // Double check the size limit
        if (buffer.byteLength < SIZE_LIMIT) {
            console.log('⬆️  Uploading artwork to Bluesky...');
            const { data } = await agent.uploadBlob(new Uint8Array(buffer), { encoding: 'image/jpeg' });
            console.log('✅  Uploaded!');

            postObject.embed = {
                $type: 'app.bsky.embed.images',
                images: [{
                    alt: `Album artwork for "${song.album}" by ${song.artist}`,
                    image: data.blob,
                    aspectRatio: {
                        width: art.width,
                        height: art.height,
                    }
                }]
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
      throw new Error(`Failed to fetch image headers: ${response.statusText}`);
    }
  
    const contentLength = response.headers.get('content-length');
    
    if (contentLength) {
      return parseInt(contentLength, 10);
    } else {
      throw new Error('Content-Length header not found');
    }
}