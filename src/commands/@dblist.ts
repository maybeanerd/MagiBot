import { bot } from '../bot';
import data from '../db';
import { asyncForEach } from '../bamands';
import { commandCategories } from '../types/enums';

export const dblist: magibotCommand = {
  name: 'dblist',
  async main(content, msg) {
    const users = await data.getDBLSubs();
    let str = `There are ${users.length} users currently subscribed to the DBL vote reminder:\n\n`;
    asyncForEach(users, async (u, i) => {
      // eslint-disable-next-line no-underscore-dangle
      str += `${i}. ${(await bot.users.fetch(u._id)).username} - voted: ${u.voted}\n`;
    });
    msg.channel.send(str);
  },
  ehelp() {
    return [{ name: '', value: 'get all users that are subscribed to the dbl reminder.' }];
  },
  perm: 'SEND_MESSAGES',
  dev: true,
  admin: true,
  hide: true,
  category: commandCategories.misc,
};
