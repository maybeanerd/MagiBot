import dotenv from 'dotenv';
import path from 'path';

dotenv.config(); // load .env into environment

const token = process.env.TOKEN;
const appId = process.env.APP_ID;
const owner = process.env.OWNERID;
const dburl = process.env.DATABASE_URL;
let blapis: {
  [listname: string]: string;
};

try {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  blapis = require(path.join(__dirname, '..', 'botlistTokens.json'));
  console.info('Found botlist tokens:', Object.keys(blapis));
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('No bot list tokens found, defaulting to none');
  blapis = {};
}

if (!(token && owner && dburl && appId)) {
  throw new Error('Missing .env configuration!');
}

export default {
  tk: token,
  owner,
  dburl,
  blapis,
  appId,
};
