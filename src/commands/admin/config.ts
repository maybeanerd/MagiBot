import { CommandInteraction, MessageEmbedOptions } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { COLOR } from '../../shared_assets';
import { MagibotAdminSlashCommand } from '../../types/command';
import { getConfiguration } from '../../dbHelpers';
import { setJoinChannel } from './joinsound';

async function viewCurrentConfiguration(interaction: CommandInteraction) {
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

  let stringifiedDefaultJoinsound = 'None';
  const { defaultJoinsound } = configuration;
  if (defaultJoinsound) {
    stringifiedDefaultJoinsound = 'Active';
  }
  info.push({
    name: 'Default guild joinsound',
    value: stringifiedDefaultJoinsound,
    inline: false,
  });

  const embed: MessageEmbedOptions = {
    color: COLOR,
    description: `Guild configuration of ${guild.name}:`,
    fields: info,
    footer: {
      iconURL: guild.iconURL() || '',
      text: guild.name,
    },
  };

  interaction.followUp({ embeds: [embed] });
}

async function runCommand(interaction: CommandInteraction) {
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
