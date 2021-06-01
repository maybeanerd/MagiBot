import { MessageEmbedOptions } from 'discord.js';
import { commandCategories } from '../types/enums';
import { PREFIXES } from '../shared_assets';
import { findMember } from '../bamands';
import { magibotCommand } from '../types/magibot';
import { SaltrankModel } from '../db';
import { getUser } from '../dbHelpers';

async function getSalt(userid: string, guildID: string) {
  const result = await SaltrankModel.findOne({
    salter: userid,
    guild: guildID,
  });
  if (!result) {
    return 0;
  }
  return result.salt;
}

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
        msg.reply(
          ` you need to define the user uniquely or not mention any user. For more help use \`${PREFIXES.get(
            msg.guild.id,
          )}.help profile\``,
        );
        return;
      }
      const info: Array<{
        name: string;
        value: string;
        inline: boolean;
      }> = [];
      const salt = await getSalt(id, msg.guild.id);
      const { botusage, sound } = await getUser(id, msg.guild.id);
      info.push({
        name: 'Saltlevel',
        value: String(salt),
        inline: false,
      });
      info.push({
        name: 'Bot usage',
        value: String(botusage),
        inline: false,
      });
      info.push({
        name: 'Joinsound',
        value: sound || 'Empty',
        inline: false,
      });
      const user = await msg.guild.members.fetch(id);
      const embed: MessageEmbedOptions = {
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
    return [
      { name: '', value: 'Get info about yourself.' },
      {
        name: '<@user|userid|nickname>',
        value:
          'Get info about a certain user. If you use the nickname you need to at least define three characters.',
      },
    ];
  },
  perm: ['SEND_MESSAGES', 'EMBED_LINKS'],
  admin: false,
  hide: false,
  category: commandCategories.util,
};
