import dotenv from 'dotenv';

dotenv.config(); // load .env into environment

const token = process.env.TOKEN;
const owner = process.env.OWNERID;
const prefix = process.env.PREFIX;
const dburl = process.env.DATABASE_URL;
// eslint-disable-next-line global-require
const blapis = (require('./botlistTokens.json') || {}) as {
  [listname: string]: string;
};

if (!(token && owner && prefix && dburl)) {
  throw new Error('Missing .env configuration!');
}

export default {
  tk: token,
  owner,
  prefix,
  dburl,
  blapis,
};
