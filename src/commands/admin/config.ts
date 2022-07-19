import {
  APIEmbed,
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from 'discord.js';
import { MagibotAdminSlashCommand } from '../../types/command';
import { getConfiguration } from '../../dbHelpers';
import { setJoinChannel } from './joinsound';

async function viewCurrentConfiguration(
  interaction: ChatInputCommandInteraction,
) {
  const guild = interaction.guild!;
  const guildId = guild.id;

  const info: Array<{
    name: string;
    value: string;
    inline: boolean;
  }> = [];
  const configuration = await getConfiguration(guildId);

  let stringifiedJoinsoundChannels = '';
  const { joinChannels } = configuration;
  if (joinChannels.length === 0) {
    stringifiedJoinsoundChannels = 'All';
  } else {
    joinChannels.forEach((channel) => {
      const voiceChannel = guild!.channels.cache.get(channel);
      if (voiceChannel) {
        stringifiedJoinsoundChannels += `${voiceChannel.name}, `;
      } else {
        setJoinChannel(guild!.id, channel, false);
      }
    });
    stringifiedJoinsoundChannels = stringifiedJoinsoundChannels.substring(
      0,
      stringifiedJoinsoundChannels.length - 2,
    );
  }
  info.push({
    name: 'Joinsound channels',
    value: stringifiedJoinsoundChannels,
    inline: false,
  });

  const { defaultJoinsoundTitle } = configuration;
  info.push({
    name: 'Default guild joinsound',
    value: defaultJoinsoundTitle || 'None',
    inline: false,
  });

  const embed: APIEmbed = {
    color: (interaction.member as GuildMember).displayColor,
    description: `Guild configuration of ${guild.name}:`,
    fields: info,
    footer: {
      icon_url: guild.iconURL() || '',
      text: guild.name,
    },
  };

  interaction.followUp({ embeds: [embed] });
}

async function runCommand(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand(true) as 'view';

  if (subcommand === 'view') {
    return viewCurrentConfiguration(interaction);
  }
  return null;
}

function registerSlashCommand(builder: SlashCommandBuilder) {
  return builder.addSubcommandGroup((subcommandGroup) => subcommandGroup
    .setName('config')
    .setDescription('Adjust or view this guilds configuration of the bot.')
    .addSubcommand((subcommand) => subcommand
      .setName('view')
      .setDescription('View this guilds configuration of the bot.')));
}
export const config: MagibotAdminSlashCommand = {
  permissions: [],
  run: runCommand,
  registerSlashCommand,
};
