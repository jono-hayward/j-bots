import fs from 'fs';
import path from 'path';

import './config.js';
import { getBluesky } from './connections.js';
const agent = await getBluesky();

export const post = async ( postObject ) => {
    console.log('');
    console.log('✉️  Posting to Bluesky', postObject);

    let success;

    try {
      await agent.post(postObject);
      console.log('☑️  Done!');
      success = true;
    } catch (err) {
      console.error('⛔  Failed to post to Bluesky: ', err);
      postObject.error = err;
      const logDir = path.join('./log/failed-posts');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
      }
      const logFileName = `${process.env.STATION}.${song.started.toISOString().replace(/[:.]/g, '-')}.json`;
      const logFilePath = path.join(logDir, logFileName);
      fs.writeFileSync(logFilePath, JSON.stringify(postObject, null, 2), 'utf8');
      if (process.env.HB_POST) {
	      // Post failure to heartbeat monitor
        await fetch(`${process.env.HB_POST}/1`);
      }
    }

    if (process.env.HB_POST && success) {
      // Post success to heartbeat monitor
      console.log(`🏓  Pinging post check with success status.`);
      try {
        await fetch(`${process.env.HB_POST}/0`, {
          signal: AbortSignal.timeout(2000),
        });
      } catch (err) {
        console.error('Failed to ping post status', err);
      }
    }
    
    return;
}