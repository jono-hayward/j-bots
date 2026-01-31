import { generateCountdownGraphic } from "./countdown_graphic.js";
import fs from "fs";

/**
 * Test script to generate a sample countdown graphic
 * Usage: node app/test_countdown.js [number] [station]
 */

const number = parseInt(process.argv[2]) || 42;
const station = process.argv[3] || "triplej";

const countdownTitles = {
  triplej: "Triple J's Hottest 100 of 2025",
  doublej: "Double J's Hottest 100 of 2005",
};

const countdown = {
  title: countdownTitles[station] || countdownTitles.triplej,
};

console.log(`Generating countdown graphic for #${number}`);
console.log(`Countdown: ${countdown.title}`);

try {
  const buffer = await generateCountdownGraphic(number, countdown);
  const filename = `test-countdown-${number}.png`;
  fs.writeFileSync(filename, buffer);
  console.log(`✅ Generated ${filename}`);
  console.log(`   Size: ${(buffer.length / 1024).toFixed(2)} KB`);
} catch (err) {
  console.error("❌ Failed to generate graphic:", err);
  process.exit(1);
}
