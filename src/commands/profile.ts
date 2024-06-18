import { CommandInteraction } from 'discord.js';
import { APIEmbed } from 'discord-api-types/v10';
import { SlashCommandBuilder } from '@discordjs/builders';
import { DeferReply, MagibotSlashCommand } from '../types/command';
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
async function runCommand(interaction: CommandInteraction) {
  const guild = interaction.guild!;
  const interactionOption = interaction.options.get('user', false);
  const userId = interactionOption?.user?.id;
  const member = await guild.members.fetch(userId ?? interaction.user.id)!;
  const info: Array<{
    name: string;
    value: string;
    inline: boolean;
  }> = [];
  const salt = await getSalt(member.id, guild.id);
  const { botusage } = await getUser(member.id, guild.id);

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
  const embed: APIEmbed = {
    color: member.displayColor,
    description: `Here's some info on ${member.displayName}`,
    fields: info,
    thumbnail: { url: member.user.avatarURL() || '' },
    footer: {
      icon_url: member.user.avatarURL() || '',
      text: member.user.tag,
    },
  };
  interaction.followUp({ embeds: [embed] });
}
const slashCommand = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Get the MagiBot profile of a user.')
  .setDMPermission(false)
  .addUserOption((option) => option
    .setName('user')
    .setDescription(
      'The user you want the profile of. Leave empty to get your own.',
    )
    .setRequired(false));

export const profile: MagibotSlashCommand = {
  permissions: [],
  definition: slashCommand.toJSON(),
  run: runCommand,
  defer: DeferReply.public,
};
