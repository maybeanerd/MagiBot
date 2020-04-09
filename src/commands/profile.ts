import { MessageEmbedOptions } from 'discord.js';
import { commandCategories } from '../types/enums';
import { PREFIXES } from '../shared_assets';
import data from '../db';
import { findMember } from '../bamands';

export const profile: magibotCommand = {
  name: 'profile',
  dev: false,
  main: async function main(content, msg) {
    if (msg.guild) {
      const args = content.split(/ +/);
      const mention = args[0];
      let id = await findMember(msg.guild, mention);
      if (!id && !mention) {
        id = msg.author.id;
      } else if (!id) {
        msg.reply(` you need to define the user uniquely or not mention any user. For more help use \`${PREFIXES[msg.guild.id]}.help profile\``);
        return;
      }
      const info: Array<{
        name: string;
        value: string;
        inline: boolean;
      }> = [];
      const salt = await data.getSalt(id, msg.guild.id);
      const usage = await data.getUsage(id, msg.guild.id);
      info.push({
        name: 'Saltlevel',
        value: salt,
        inline: false,
      });
      info.push({
        name: 'Bot usage',
        value: String(usage),
        inline: false,
      });
      const link = await data.getSound(id, msg.guild.id);
      info.push({
        name: 'Joinsound',
        value: link,
        inline: false,
      });
      const user = await msg.guild.members.fetch(id);
      const embed:MessageEmbedOptions = {
        color: user.displayColor,
        description: `Here's some info on ${user.displayName}`,
        fields: info,
        thumbnail: { url: user.user.avatarURL() || '' },
        footer: {
          iconURL: user.user.avatarURL() || '',
          text: user.user.tag,
        },
      };
      msg.channel.send('', { embed });
    } else {
      msg.reply('This command is only available in guilds.');
    }
  },
  ehelp() {
    return [{ name: '', value: 'Get info about yourself.' }, { name: '<@user|userid|nickname>', value: 'Get info about a certain user. If you use the nickname you need to at least define three characters.' }];
  },
  perm: 'SEND_MESSAGES',
  admin: false,
  hide: false,
  category: commandCategories.util,
};
