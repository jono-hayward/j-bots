import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Countdown Graphic Generator
 *
 * This module generates countdown graphics on-the-fly for Hottest 100 posts.
 * Instead of pregenerating all 100 graphics, it creates them dynamically based on
 * the countdown information from the hottest dates configuration.
 *
 * Fonts are referenced directly from the fonts directory for portability.
 *
 * @module countdown_graphic
 */

/**
 * Get font paths relative to this module
 * @returns {Object} Object containing font file paths
 */
function getFontPaths() {
  const fontsDir = path.join(__dirname, "..", "fonts");

  return {
    spaceGrotesk: path.join(fontsDir, "SpaceGrotesk.ttf"),
    spaceMono: path.join(fontsDir, "SpaceMono-Bold.ttf"),
  };
}

const fonts = getFontPaths();

/**
 * Configuration for the countdown graphics.
 * @type {const}
 */
const CONFIG = {
  canvasSize: 1200,
  bgColour: "#F23F2D",
  gridSize: 10,
  padding: 45,
  spacing: 45,
  borderWidth: 3,
  borderColour: "#FFFFFF",
  fillDiameter: 31.5,
  fillColour: "#FFFFFF",
  // Calculated circle diameter: (1200 - 2*45 - 9*45) / 10 = 70.5px
  circleDiameter: 70.5,
  playingCircle: {
    diameter: 52.5,
    circleFill: "#FFFFFF",
    playSymbolFill: "#F23F2D",
  },
  overlay: {
    columns: 6, // Default for 1-100, will be 8 for 101-200
    rows: 4,
    fillOpacity: 0.85,
    textTopOffset: 0,
    textBottomOffset: 15,
    counterFontSize: "435pt",
    taglineFontSize: "30pt",
    shadeExpansion: 15, // Adds 30px overall while keeping the rectangle centred
    shadeBlur: 3, // Matches CSS backdrop-filter: blur(3px)
  },
  echoes: [
    { scale: 0.97, opacity: 0.2, blur: 2.25 },
    { scale: 0.94, opacity: 0.15, blur: 3 },
  ],
};

/**
 * Generates SVG for a single circle with optional fill.
 *
 * @param {number} x - X coordinate.
 * @param {number} y - Y coordinate.
 * @param {boolean} filled - Whether the circle should be filled.
 * @returns {string} SVG circle element.
 */
function generateCircle(x, y, filled) {
  const radius = CONFIG.circleDiameter / 2;
  const fillRadius = CONFIG.fillDiameter / 2;

  let svg = `<circle cx="${x}" cy="${y}" r="${radius}"
    fill="none"
    stroke="${CONFIG.borderColour}"
    stroke-width="${CONFIG.borderWidth}" />`;

  if (filled) {
    svg += `<circle cx="${x}" cy="${y}" r="${fillRadius}"
      fill="${CONFIG.fillColour}" />`;
  }

  return svg;
}

/**
 * Generates SVG for the currently playing circle with a play symbol.
 *
 * @param {number} x - X coordinate.
 * @param {number} y - Y coordinate.
 * @returns {string} SVG for playing circle with play symbol.
 */
function generatePlayingCircle(x, y) {
  const outerRadius = CONFIG.circleDiameter / 2;
  const innerRadius = CONFIG.playingCircle.diameter / 2;

  // Play triangle path matching the provided SVG design
  // Scaled from the 35x35 viewBox coordinates to be centred at (x, y)
  // Original path: M24.1788 15.7897 ... L12 11.958
  // Centre of original SVG: (17.5, 17.5)
  // Offset coordinates to centre around our x, y
  const offsetX = x - 17.5;
  const offsetY = y - 17.5;

  // Path with rounded corners (stroke-linejoin="round" stroke-linecap="round")
  const playPath = `M ${24.1788 + offsetX} ${15.7897 + offsetY} C ${25.463 + offsetX} ${16.5683 + offsetY} ${25.463 + offsetX} ${18.4317 + offsetY} ${24.1788 + offsetX} ${19.2103 + offsetY} L ${15.0368 + offsetX} ${24.7523 + offsetY} C ${13.7039 + offsetX} ${25.5603 + offsetY} ${12 + offsetX} ${24.6007 + offsetY} ${12 + offsetX} ${23.042 + offsetY} L ${12 + offsetX} ${11.958 + offsetY} C ${12 + offsetX} ${10.3993 + offsetY} ${13.7039 + offsetX} ${9.43968 + offsetY} ${15.0368 + offsetX} ${10.2477 + offsetY} L ${24.1788 + offsetX} ${15.7897 + offsetY} Z`;

  return `
    <circle cx="${x}" cy="${y}" r="${outerRadius}"
      fill="none"
      stroke="${CONFIG.borderColour}"
      stroke-width="${CONFIG.borderWidth}" />
    <circle cx="${x}" cy="${y}" r="${innerRadius}"
      fill="${CONFIG.playingCircle.circleFill}" />
    <path d="${playPath}"
      fill="${CONFIG.playingCircle.playSymbolFill}"
      stroke-linejoin="round"
      stroke-linecap="round" />
  `;
}

/**
 * Generates the complete grid SVG for a given countdown number.
 *
 * @param {number} countdownNumber - Current countdown position (1-200).
 * @returns {string} Complete SVG grid.
 */
function generateGrid(countdownNumber) {
  let circles = "";

  // For Hottest 200 (101-200), adjust the countdown number to match grid positions
  const adjustedCountdown =
    countdownNumber > 100 ? countdownNumber - 100 : countdownNumber;

  for (let col = 0; col < CONFIG.gridSize; col++) {
    for (let row = 0; row < CONFIG.gridSize; row++) {
      // Calculate position number (100 at top-left, 1 at bottom-right, counting vertically)
      const positionNumber = 100 - (col * CONFIG.gridSize + row);

      // Determine if this circle should be filled
      const filled = positionNumber >= adjustedCountdown;

      // Check if this is the currently playing song
      const isPlaying = positionNumber === adjustedCountdown;

      // Calculate circle centre coordinates
      const x =
        CONFIG.padding +
        col * (CONFIG.circleDiameter + CONFIG.spacing) +
        CONFIG.circleDiameter / 2;
      const y =
        CONFIG.padding +
        row * (CONFIG.circleDiameter + CONFIG.spacing) +
        CONFIG.circleDiameter / 2;

      // Use playing circle for currently playing song, otherwise use regular circle
      if (isPlaying) {
        circles += generatePlayingCircle(x, y);
      } else {
        circles += generateCircle(x, y, filled);
      }
    }
  }

  return circles;
}

/**
 * Generates the complete SVG with echo effects and overlay shade.
 *
 * @param {number} countdownNumber - Current countdown position (1-200).
 * @param {string} taglineText - Text to display in the tagline (e.g., "TRIPLE J HOTTEST 100 OF 2025").
 * @returns {string} Complete SVG document.
 */
function generateSVG(countdownNumber, taglineText) {
  const grid = generateGrid(countdownNumber);

  // Use 8 columns for Hottest 200 (101-200) to accommodate three-digit numbers
  const overlayColumns = countdownNumber > 100 ? 8 : CONFIG.overlay.columns;

  const overlayWidth =
    overlayColumns * CONFIG.circleDiameter +
    (overlayColumns - 1) * CONFIG.spacing;
  const overlayHeight =
    CONFIG.overlay.rows * CONFIG.circleDiameter +
    (CONFIG.overlay.rows - 1) * CONFIG.spacing;
  const overlayX = (CONFIG.canvasSize - overlayWidth) / 2;
  const overlayY = (CONFIG.canvasSize - overlayHeight) / 2;

  // Expand the shade rectangle by 20px overall (10px each side) and keep it centred.
  const expansion = CONFIG.overlay.shadeExpansion;
  const shadeX = overlayX - expansion;
  const shadeY = overlayY - expansion;
  const shadeWidth = overlayWidth + expansion * 2;
  const shadeHeight = overlayHeight + expansion * 2;

  const centreX = CONFIG.canvasSize / 2;
  const counterTextY = overlayY + CONFIG.overlay.textTopOffset;
  const taglineTextY =
    overlayY + overlayHeight - CONFIG.overlay.textBottomOffset;

  // Generate echo layers (back to front)
  let echoes = "";
  for (let i = CONFIG.echoes.length - 1; i >= 0; i--) {
    const echo = CONFIG.echoes[i];
    const scale = echo.scale;
    const offset = (CONFIG.canvasSize * (1 - scale)) / 2;

    echoes += `
      <g opacity="${echo.opacity}" filter="url(#blur${i})">
        <g transform="translate(${offset}, ${offset}) scale(${scale})">
          ${grid}
        </g>
      </g>
    `;
  }

  // Define blur filters
  let filters = "";
  CONFIG.echoes.forEach((echo, i) => {
    filters += `
      <filter id="blur${i}">
        <feGaussianBlur stdDeviation="${echo.blur}" />
      </filter>
    `;
  });

  // Shade (backdrop-blur) filter to mimic CSS backdrop-filter: blur(2px)
  const shadeFilter = `
      <filter id="shadeBlur" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${CONFIG.overlay.shadeBlur}" />
      </filter>
    `;

  const shadeClipPath = `
      <clipPath id="shadeClip" clipPathUnits="userSpaceOnUse">
        <rect x="${shadeX}" y="${shadeY}" width="${shadeWidth}" height="${shadeHeight}" />
      </clipPath>
    `;

  const baseContent = `
      <g id="baseContent">
        ${echoes}
        <g>
          ${grid}
        </g>
      </g>
    `;

  const fontStyles = `
      <style>
        @font-face {
          font-family: 'Space Grotesk';
          font-weight: 300 700;
          src: url('file://${fonts.spaceGrotesk}') format('truetype');
        }
        @font-face {
          font-family: 'Space Mono';
          font-weight: 700;
          src: url('file://${fonts.spaceMono}') format('truetype');
        }
      </style>
    `;

  return `
    <svg width="${CONFIG.canvasSize}" height="${CONFIG.canvasSize}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        ${filters}
        ${shadeFilter}
        ${shadeClipPath}
        ${baseContent}
        ${fontStyles}
      </defs>
      <rect width="${CONFIG.canvasSize}" height="${CONFIG.canvasSize}" fill="${CONFIG.bgColour}" />
      <use href="#baseContent" xlink:href="#baseContent" />
      <g clip-path="url(#shadeClip)">
        <use href="#baseContent" xlink:href="#baseContent" filter="url(#shadeBlur)" />
      </g>
      <rect
        x="${shadeX}"
        y="${shadeY}"
        width="${shadeWidth}"
        height="${shadeHeight}"
        fill="${CONFIG.bgColour}"
        fill-opacity="${CONFIG.overlay.fillOpacity}"
      />
      <text x="${centreX}" y="${counterTextY}" text-anchor="middle" dominant-baseline="hanging" font-family="'Space Mono', monospace" font-size="${CONFIG.overlay.counterFontSize}" font-weight="700" fill="${CONFIG.fillColour}">
        ${countdownNumber}
      </text>
      <text x="${centreX}" y="${taglineTextY}" text-anchor="middle" dominant-baseline="alphabetic" font-family="'Space Grotesk', sans-serif" font-size="${CONFIG.overlay.taglineFontSize}" fill="${CONFIG.fillColour}" xml:space="preserve">
        ${taglineText}
      </text>
    </svg>
  `;
}

/**
 * Generates a countdown graphic buffer for a specific countdown number.
 * This function creates the graphic on-the-fly without saving to disk.
 *
 * @param {number} countdownNumber - Current countdown position (1-200).
 * @param {Object} countdownInfo - Countdown information object with title.
 * @param {string} countdownInfo.title - The countdown title (e.g., "Triple J's Hottest 100 of 2025").
 * @returns {Promise<Buffer>} PNG image buffer.
 */
export async function generateCountdownGraphic(countdownNumber, countdownInfo) {
  // Parse the title to extract station and year/type information
  // e.g., "Triple J's Hottest 100 of 2025" -> "TRIPLE J  HOTTEST 100 OF 2025"
  // e.g., "Double J's Hottest 100 of 2005" -> "DOUBLE J  HOTTEST 100 OF 2005"

  const titleMatch = countdownInfo.title.match(/^(.*?)'s\s+(.*)$/i);
  let taglineText;

  if (titleMatch) {
    const station = titleMatch[1].toUpperCase();
    const restOfTitle = titleMatch[2].toUpperCase();

    // Format with all spaces inside the second tspan (no space between tags)
    // This provides visual separation while maintaining proper centering with xml:space="preserve"
    taglineText = `<tspan font-weight="300">${station}</tspan><tspan font-weight="700">    ${restOfTitle}  </tspan>`;
  } else {
    // Fallback if the title doesn't match expected format
    taglineText = `<tspan font-weight="700">${countdownInfo.title.toUpperCase()}</tspan>`;
  }

  const svg = generateSVG(countdownNumber, taglineText);
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return buffer;
}
