import { commandCategories } from '../types/enums';

export const ping: magibotCommand = {
  name: 'ping',
  dev: false,
  hide: false,
  main(bot, msg) {
    const start = Date.now();
    msg.channel.send('Pong!').then((newMsg) => {
      const stop = Date.now();
      const diff = stop - start;
      newMsg.edit(`Pong! \nReactiontime: \`(${diff}ms)\``);
    });
  },
  ehelp() {
    return [{ name: '', value: 'Ping the bot and get the response time.' }];
  },
  perm: 'SEND_MESSAGES',
  admin: false,
  category: commandCategories.misc,
};
