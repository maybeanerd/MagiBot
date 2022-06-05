import { CommandInteraction, MessageEmbedOptions } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { commandCategories } from '../types/enums';
import { MagibotSlashCommand } from '../types/command';
import { SaltrankModel } from '../db';
import { getGlobalUser, getUser } from '../dbHelpers';

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
async function runCommand(interaction: CommandInteraction) {
  const guild = interaction.guild!;
  const passedUser = interaction.options.getUser('user', false);
  const member = await guild.members.fetch(
    passedUser?.id ?? interaction.user.id,
  )!;
  const info: Array<{
    name: string;
    value: string;
    inline: boolean;
  }> = [];
  const salt = await getSalt(member.id, guild.id);
  const { botusage, sound } = await getUser(member.id, guild.id);
  let joinsound = sound;
  let isGlobalSound = false;
  if (!joinsound) {
    const globalUser = await getGlobalUser(member.id);
    if (globalUser && globalUser.sound) {
      joinsound = globalUser.sound;
      isGlobalSound = true;
    }
  }
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
    name: `Joinsound${isGlobalSound ? ' (default)' : ''}`,
    value: joinsound || 'Empty',
    inline: false,
  });
  const embed: MessageEmbedOptions = {
    color: member.displayColor,
    description: `Here's some info on ${member.displayName}`,
    fields: info,
    thumbnail: { url: member.user.avatarURL() || '' },
    footer: {
      iconURL: member.user.avatarURL() || '',
      text: member.user.tag,
    },
  };
  interaction.followUp({ embeds: [embed] });
}
const slashCommand = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Get the MagiBot profile of a user.')
  .addUserOption((option) => option
    .setName('user')
    .setDescription(
      'The user you want the profile of. Leave empty to get your own.',
    )
    .setRequired(false));

export const profile: MagibotSlashCommand = {
  help() {
    return [
      {
        name: '',
        value: 'Get info about yourself.',
      },
      {
        name: '@user',
        value:
          'Get info about a certain user.',
      },
    ];
  },
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
  category: commandCategories.util,
  definition: slashCommand.toJSON(),
  run: runCommand,
  isSlow: true,
};
