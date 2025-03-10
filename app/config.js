import dotenv from 'dotenv';

// Load global config
dotenv.config();

// Load station-specific config
if (!process.env.STATION) {
  console.error('🚫  No station specified.');
  process.exit(1);
}

dotenv.config({ path: `.${process.env.STATION}.env` });

console.log(`✅  Config loaded for station: ${process.env.STATION}`);