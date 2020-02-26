import { Message } from 'discord.js';
import data from '../db';
import * as cmds from '../bamands';
import { commandCategories } from '../types/enums';
import { PREFIXES } from '../shared_assets';


function printHelp(msg:Message) {
  const info:Array<{name:string, value:string}> = [];
  info.push({
    name: 'add <@user|userid|nickname>',
    value: 'Report a user being salty. If you use nickname it has to be at least three characters long and unique.\nThis has a 1h cooldown for reporting the same user.',
  });
  info.push({
    name: 'top',
    value: `Displays the top 5 salter in ${msg.guild.name}`,
  });
  return info;
}

export const salt:magibotCommand = {
  main: async function main(content:string, msg:Message) {
    const args = msg.content.split(/ +/);
    const command = args[0].toLowerCase();
    if (msg.guild) {
      switch (command) {
      case 'add':
        /* eslint-disable no-case-declarations */
        const mention = args[1];
        const uid = await cmds.findMember(msg.guild, mention);
        /* eslint-enable no-case-declarations */
        if (mention && uid) {
          if (uid === msg.author.id) {
            msg.reply("you can't report yourself!");
            return;
          }
          const mem = await msg.guild.fetchMember(uid).catch(() => { });
          if (!mem) {
            msg.reply("the user with this ID doesn't exist on this guild.");
            return;
          }
          if (mem.user.bot) {
            msg.reply("you can't report bots!");
            return;
          }
          const time = await data.saltUp(uid, msg.author.id, msg.guild);
          if (time === 0) {
            msg.channel.send(`Successfully reported ${mem} for being a salty bitch!`);
          } else {
            msg.reply(`you can report ${mem} again in ${59 - Math.floor((time * 60) % 60)} min and ${60 - Math.floor((time * 60 * 60) % 60)} sec!`);
          }
        } else {
          msg.reply('you need to mention a user you want to report!');
        }
        break;
      case 'top':
        /* eslint-disable no-case-declarations */
        const salters = await data.topSalt(msg.guild.id);
        const info:Array<{name:string, value:string, inline:boolean}> = [];
        /* eslint-enable no-case-declarations */
        for (let i = 0; i < 5; i++) {
          let mname = 'User left guild';
          if (salters[i]) {
            // eslint-disable-next-line no-await-in-loop
            const member = await msg.guild.fetchMember(salters[i].salter).catch(() => { });
            if (member) {
              mname = member.displayName;
            }
            info.push({
              name: `${i + 1}. place: ${mname}`,
              value: `${salters[i].salt} salt`,
              inline: false,
            });
          } else { break; }
        }
        /* eslint-disable no-case-declarations */
        const embed = {
          color: 0xffffff,
          description: `Top 5 salter in ${msg.guild.name}:`,
          fields: info,
          footer: {
            /* eslint-disable camelcase */
            icon_url: await msg.guild.iconURL,
            /* eslint-enable camelcase */
            text: await msg.guild.name,
          },
        };
        /* eslint-enable no-case-declarations */
        msg.channel.send('', { embed });
        break;
      default:
        msg.reply(`this command doesn't exist. Use \`${PREFIXES[msg.guild.id]}.help salt\` for more info.`);
        break;
      }
    } else {
      msg.reply('commands are only functional when used in a guild.');
    }
  },
  name: 'salt',
  help: 'Salt commands',
  ehelp(msg:Message) { return printHelp(msg); },
  perm: 'SEND_MESSAGES',
  admin: false,
  hide: false,
  category: commandCategories.fun,
  dev: false,
};
