import dotenv from 'dotenv';

// Load global config
dotenv.config();

// Load station-specific config
if (process.env.STATION) {
  dotenv.config({ path: `.${process.env.STATION}.env` });
  console.log(`✅  Config loaded for station: ${process.env.STATION}`);
}