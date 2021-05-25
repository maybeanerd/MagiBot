import { PREFIXES } from '../shared_assets';
import data from '../db';
import { commandCategories } from '../types/enums';
import { findMember } from '../bamands';
import { magibotCommand } from '../types/magibot';

function printHelp() {
  const info: Array<{ name: string; value: string }> = [];

  info.push({
    name: 'rem <@User|userid|nickname>',
    value:
      'Remove the joinsound of a user. If you use nickname it has to be at least three characters long',
  });

  return info;
}

export const sound: magibotCommand = {
  name: 'sound',
  dev: false,
  main: async function main(content, msg) {
    const args = content.split(/ +/);
    const command = args[0].toLowerCase();
    const mention = args[1];
    switch (command) {
    case 'rem':
      /* eslint-disable no-case-declarations */
      const uid = await findMember(msg.guild!, mention);
      /* eslint-enable no-case-declarations */
      if (mention && uid) {
        if (await data.addSound(uid, false, msg.guild!.id)) {
          msg.reply(`you successfully removed <@!${uid}>s joinsound!`);
        } else {
          msg.reply('Aaaaaand you failed.');
        }
      } else {
        msg.reply('you need to mention a user you want to use this on!');
      }
      break;
    default:
      msg.reply(
        `this command doesn't exist. Use \`${
          PREFIXES[msg.guild!.id]
        }:help sound\` for more info.`,
      );
      break;
    }
  },
  ehelp() {
    return printHelp();
  },
  perm: 'SEND_MESSAGES',
  admin: true,
  hide: false,
  category: commandCategories.util,
};
