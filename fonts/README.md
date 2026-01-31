# Countdown Graphic Fonts

This directory contains the fonts used to generate Hottest 100 countdown graphics.

## Fonts Included

- **Space Grotesk** (`SpaceGrotesk.ttf`) - Variable font used for the tagline text
  - Weight range: 300 (Light) to 700 (Bold)
  - Used for: "TRIPLE J HOTTEST 100 OF 2025" text

- **Space Mono Bold** (`SpaceMono-Bold.ttf`) - Monospace font used for the countdown number
  - Weight: 700 (Bold)
  - Used for: Large countdown number (e.g., "42")

## Source

Both fonts are from [Google Fonts](https://fonts.google.com/) and are licensed under the [SIL Open Font License](https://scripts.sil.org/OFL).

- Space Grotesk: https://fonts.google.com/specimen/Space+Grotesk
- Space Mono: https://fonts.google.com/specimen/Space+Mono

## Usage

These fonts are automatically referenced via `@font-face` with `file://` URLs in the generated SVGs by `countdown_graphic.js`. This ensures the graphics render correctly on any system without requiring system font installation, while keeping the generated SVG files lightweight.

## Updating Fonts

If you need to update or replace these fonts:

1. Download the new font files from Google Fonts
2. Replace the files in this directory
3. The countdown generator will automatically use the new fonts

**Note:** The filenames must match what's referenced in `countdown_graphic.js`:
- `SpaceGrotesk.ttf`
- `SpaceMono-Bold.ttf`
