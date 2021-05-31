import { Guild, Message, MessageEmbedOptions } from 'discord.js';
import * as cmds from '../bamands';
import { commandCategories } from '../types/enums';
import { PREFIXES } from '../shared_assets';
import { magibotCommand } from '../types/magibot';
import {
  SaltModel, SaltrankModel, updateSaltKing, topSalt,
} from '../db';

async function saltDowntimeDone(userid1: string, userid2: string) {
  // get newest entry in salt
  const d2 = await SaltModel.find({ salter: userid1, reporter: userid2 })
    .sort({ date: -1 })
    .limit(1);
  if (d2[0]) {
    const d1 = new Date();
    const ret = (d1.getTime() - d2[0].date.getTime()) / 1000 / 60 / 60;
    return ret;
  }
  return 2;
}

async function saltGuild(
  salter: string,
  guildID: string,
  add = 1,
  reset = false,
) {
  const user = await SaltrankModel.findOne({ salter, guild: guildID });
  if (!user) {
    const myobj = new SaltrankModel({ salter, salt: 1, guild: guildID });
    await myobj.save();
  } else {
    const slt = user.salt + add;
    if (slt <= 0 || reset) {
      await SaltrankModel.deleteOne({ salter, guild: guildID });
    } else {
      const update = { $set: { salt: slt } };
      await SaltrankModel.updateOne({ salter, guild: guildID }, update);
    }
  }
}

async function saltUp(
  salter: string,
  reporter: string,
  admin: boolean,
  guild: Guild,
) {
  const time = await saltDowntimeDone(salter, reporter);
  if (time > 1 || admin) {
    const date = new Date();
    const myobj = new SaltModel({
      salter,
      reporter,
      date,
      guild: guild.id,
    });
    await myobj.save();
    await saltGuild(salter, guild.id, 1);
    await updateSaltKing(guild);
    return 0;
  }
  return time;
}

// TODO we might want to add even more of the DB logic into here

function printHelp(msg: Message) {
  const info: Array<{ name: string; value: string }> = [];
  info.push({
    name: 'add <@user|userid|nickname>',
    value:
      'Report a user being salty. If you use nickname it has to be at least three characters long and unique.\nThis has a 1h cooldown for reporting the same user.',
  });
  info.push({
    name: 'top',
    value: `Displays the top 5 salter in ${msg.guild!.name}`,
  });
  return info;
}

export const salt: magibotCommand = {
  main: async function main(content: string, msg: Message) {
    const args = content.split(/ +/);
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
          const mem = await msg.guild.members.fetch(uid).catch(() => {});
          if (!mem) {
            msg.reply("the user with this ID doesn't exist on this guild.");
            return;
          }
          if (mem.user.bot) {
            msg.reply("you can't report bots!");
            return;
          }
          const time = await saltUp(uid, msg.author.id, false, msg.guild);
          if (time === 0) {
            msg.channel.send(
              `Successfully reported ${mem} for being a salty bitch!`,
            );
          } else {
            msg.reply(
              `you can report ${mem} again in ${
                59 - Math.floor((time * 60) % 60)
              } min and ${60 - Math.floor((time * 60 * 60) % 60)} sec!`,
            );
          }
        } else {
          msg.reply('you need to mention a user you want to report!');
        }
        break;
      case 'top':
        /* eslint-disable no-case-declarations */
        const salters = await topSalt(msg.guild.id);
        const info: Array<{
            name: string;
            value: string;
            inline: boolean;
          }> = [];
          /* eslint-enable no-case-declarations */
        for (let i = 0; i < 5; i++) {
          let mname = 'User left guild';
          if (salters[i]) {
            // eslint-disable-next-line no-await-in-loop
            const member = await msg.guild.members
              .fetch(salters[i].salter)
              .catch(() => {});
            if (member) {
              mname = member.displayName;
            }
            info.push({
              name: `${i + 1}. place: ${mname}`,
              value: `${salters[i].salt} salt`,
              inline: false,
            });
          } else {
            break;
          }
        }
        /* eslint-disable no-case-declarations */
        const embed: MessageEmbedOptions = {
          color: 0xffffff,
          description: `Top 5 salter in ${msg.guild.name}:`,
          fields: info,
          footer: {
            iconURL: msg.guild.iconURL() || '',
            text: msg.guild.name,
          },
        };
          /* eslint-enable no-case-declarations */
        msg.channel.send('', { embed });
        break;
      default:
        msg.reply(
          `this command doesn't exist. Use \`${
            PREFIXES.get(msg.guild.id)
          }.help salt\` for more info.`,
        );
        break;
      }
    } else {
      msg.reply('commands are only functional when used in a guild.');
    }
  },
  name: 'salt',
  ehelp(msg: Message) {
    return printHelp(msg);
  },
  perm: 'SEND_MESSAGES',
  admin: false,
  hide: false,
  category: commandCategories.fun,
  dev: false,
};
