import "./config.js";

import { getBluesky, getRedis } from "./connections.js";
import { getCountdown } from "./helpers.js";
import { generateCountdownGraphic } from "./countdown_graphic.js";
const agent = await getBluesky();
const redis = await getRedis();

const SIZE_LIMIT = 1000000;

export const process_artwork = async (song, postObject) => {
  console.log(" ");
  console.log("🖼️  Processing artwork");

  const images = [];

  /**
   * Add countdown graphic if we're in a countdown
   */
  const countdown = getCountdown(song);
  if (countdown) {
    console.log(`🥁 Generating countdown graphic for #${song.count}`);
    try {
      const countdownBuffer = await generateCountdownGraphic(
        song.count,
        countdown,
      );

      if (countdownBuffer.byteLength < SIZE_LIMIT) {
        console.log("⬆️  Uploading countdown graphic to Bluesky...");
        const { data } = await agent.uploadBlob(
          new Uint8Array(countdownBuffer),
          { encoding: "image/png" },
        );
        console.log("✅  Uploaded countdown graphic!");

        images.push({
          alt: `Hottest 100 - Number ${song.count}`,
          image: data.blob,
          aspectRatio: {
            width: 1,
            height: 1,
          },
        });
      } else {
        console.log("⚠️  Countdown graphic exceeds size limit, skipping...");
      }
    } catch (err) {
      console.error(
        "❌  Countdown graphic processing failed. Skipping countdown graphic...",
      );
      console.error("Error:", err);
    }
  }

  /**
   * Find the largest version of the artwork that
   * doesn't go over Bluesky's 1mb limit
   */
  let art;
  if (song.artwork.url) {
    // Check the full quality upload
    console.log("Checking file size of", song.artwork.url);
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
      console.log("Checking file size of", s.url);
      const size = await getImageSize(s.url);
      if (size && size <= SIZE_LIMIT) {
        art = s;
        break;
      }
    }
  }
  if (!art) {
    console.log("🪧  No artwork found.");
    return false;
  }

  // Set up default alt text
  const imageObject = {
    alt: `Album artwork for "${song.album}" by ${song.artist}`,
  };

  if (redis) {
    // Search for the artist in our bluesky links file
    console.log("🔍  Searching for saved artwork entries...");

    const meta = await redis.hGetAll(`artwork:${song.artwork.arid}`);
    if (Object.keys(meta).length) {
      console.log("✅  Artwork meta found, adding to image.");
      imageObject.alt = `${imageObject.alt}:\n\n${meta.alt}`;

      const labels = [];

      if (meta.adult !== "false") {
        labels.push({ val: meta.adult });
      }
      if (meta.graphic === "true") {
        labels.push({ val: "graphic-media" });
      }

      if (labels.length) {
        postObject.labels = {
          $type: "com.atproto.label.defs#selfLabels",
          values: labels,
        };
      }
    }
  }

  /**
   * Upload the art
   */

  try {
    console.log("Downloading artwork", art.url);
    const response = await fetch(art.url);
    const buffer = await response.arrayBuffer();

    // Double check the size limit
    if (buffer.byteLength < SIZE_LIMIT) {
      console.log("⬆️  Uploading artwork to Bluesky...");
      const { data } = await agent.uploadBlob(new Uint8Array(buffer), {
        encoding: "image/jpeg",
      });
      console.log("✅  Uploaded!");

      imageObject.image = data.blob;
      imageObject.aspectRatio = {
        width: art.width || 1,
        height: art.height || 1,
      };

      images.push(imageObject);
    }
  } catch (err) {
    console.error(
      "❌  Album artwork processing failed. Skipping album artwork...",
    );
    console.error("Error:", err);
  }

  /**
   * Add all images to the post embed
   */
  if (images.length > 0) {
    postObject.embed = {
      $type: "app.bsky.embed.images",
      images: images,
    };
  }
};

/**
 * Get the size of any image using fetch()
 * @param {string} url The URL of the image to get the size of
 * @returns The image size in bytes
 */
export const getImageSize = async (url) => {
  const response = await fetch(url, { method: "HEAD" });

  if (!response.ok) {
    return false;
  }

  const contentLength = response.headers.get("content-length");

  if (contentLength) {
    return parseInt(contentLength, 10);
  } else {
    return false;
  }
};
