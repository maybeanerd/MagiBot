import { commandCategories } from '../types/enums';
import { bot } from '../bot';
import data from '../db';

export const update: magibotCommand = {
  ehelp: () => [],
  perm: ['ADMINISTRATOR'],
  name: 'update',
  main: async function main(content, msg) {
    await msg.channel
      .send(`Do you want to send the update\n${content}`)
      .then((mess) => {
        const filter = (reaction, user) => (reaction.emoji.name === '☑' || reaction.emoji.name === '❌')
          && user.id === msg.author.id;
        mess.react('☑');
        mess.react('❌');
        mess.awaitReactions(filter, { max: 1, time: 60000 }).then((reacts) => {
          mess.delete();
          const frst = reacts.first();
          if (frst && frst.emoji.name === '☑') {
            data.sendUpdate(content, bot);
            msg.channel.send(`Successfully sent:\n${content}`);
          } else if (reacts.first()) {
            msg.channel.send('successfully canceled update');
          }
        });
      });
  },
  admin: true,
  hide: true,
  dev: true,
  category: commandCategories.util,
};
