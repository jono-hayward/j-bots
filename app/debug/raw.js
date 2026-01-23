import 'dotenv/config';

const config = {
  station:        process.env.STATION,
  timezone:       process.env.TIMEZONE,
};

// const now = new Date('2025-03-25T00:19:00+11:00');

const now = new Date();

now.setHours(now.getHours() - 1);

const params = new URLSearchParams( {
  station: config.station,
  order: 'asc', // We want them in descending order to always get the latest, even if for some reason there's more results than our limit
  tz: config.timezone,
  // limit: 1,
  from: now.toISOString().replace('Z', '+00:00:00'), // Turn the ISO string into something the ABC API will accept
  station: 'triplej',
} );

const API = `https://music.abcradio.net.au/api/v1/plays/search.json?${params.toString()}`;
const scrape = async () => fetch( API ).then( response => response.json() );


const tracks = await scrape();

// if (tracks.items.length) {
//   console.log( tracks.items[0] );
//   console.log( tracks.items[0].recording?.artists[0] );
// } else {
//   console.log( tracks );
// }

console.log( JSON.stringify(tracks, null, 2));

/*
const params = new URLSearchParams({
  station: config.station,
  tz: config.timezone,
  from: latest.toISOString().replace('Z', '+00:00:00'), // Turn the ISO string into something the ABC API will accept
  limit: 20,
  order: 'desc', // We want them in descending order to always get the latest, even if for some reason there's more results than our limit
});

const API = `https://music.abcradio.net.au/api/v1/plays/search.json?${params.toString()}`;

const scrape = async () => fetch(API).then(response => response.json());
const tracks = await scrape();
*/
