import {
  CommandInteraction,
  GuildMember,
  MessageEmbedOptions,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { COLOR } from '../../shared_assets';
import { getRoleMention, getUserMention } from '../../helperFunctions';
import { commandCategories } from '../../types/enums';
import { MagibotAdminSlashCommand } from '../../types/command';
import {
  getConfiguration,
  getAdminRoles,
  setConfiguration,
} from '../../dbHelpers';

async function setJoinChannel(
  guildId: string,
  cid: string,
  setActive: boolean,
) {
  const configuration = await getConfiguration(guildId);
  const { joinChannels } = configuration;
  if (setActive) {
    if (!joinChannels.includes(cid)) {
      joinChannels.push(cid);
    }
  } else {
    const index = joinChannels.indexOf(cid);
    if (index > -1) {
      joinChannels.splice(index, 1);
    }
  }
  configuration.joinChannels = joinChannels;
  await configuration.save();
}

async function setAdminRole(guildId: string, roleID: string, insert: boolean) {
  const roles = await getAdminRoles(guildId);
  if (insert) {
    if (!roles.includes(roleID)) {
      roles.push(roleID);
    }
  } else {
    const index = roles.indexOf(roleID);
    if (index > -1) {
      roles.splice(index, 1);
    }
  }
  const configuration = { adminRoles: roles };
  return setConfiguration(guildId, configuration);
}

function printHelp() {
  const info: Array<{ name: string; value: string }> = [];

  info.push({
    name: 'ban <@User>',
    value: 'Deactivate all functions of the bot for a user',
  });
  info.push({
    name: 'unban <@User>',
    value: 'Reactivate all functions of the bot for a user',
  });
  info.push({
    name: 'join',
    value: "(De)activate joinsounds for the voicechannel you're connected to",
  });
  info.push({
    name: 'admin <@Role>',
    value: '(Un)set a role to be considered admin by the bot',
  });
  info.push({
    name: 'command',
    value:
      "(De)activate bot commands for the text channel you're sending this in",
  });
  info.push({
    name: 'notification',
    value: '(Un)set a textchannel to be notification channel',
  });
  info.push({
    name: 'info',
    value: 'Displays current configuration',
  });
  info.push({
    name: 'prefix <prefix>',
    value: 'Set a custom character or string as prefix',
  });

  return info;
}

async function toggleJoinsoundChannel(
  interaction: CommandInteraction,
  activate: boolean,
) {
  const voiceChannel = (interaction.member as GuildMember).voice.channel;
  if (voiceChannel) {
    await setJoinChannel(interaction.guildId!, voiceChannel.id, activate);
    interaction.followUp(
      `Successfully ${activate ? '' : 'de'}activated joinsounds in **${
        voiceChannel.name
      }**.`,
    );
  } else {
    interaction.followUp("You're not connected to a voice channel!");
  }
}

async function toggleAdminRole(
  interaction: CommandInteraction,
  roleId: string,
  makeAdmin: boolean,
) {
  await setAdminRole(interaction.guildId!, roleId, makeAdmin);
  if (makeAdmin) {
    interaction.followUp(
      `Successfully set ${getRoleMention(roleId)} as admin role!`,
    );
  } else {
    interaction.followUp(
      `Successfully removed ${getRoleMention(roleId)} from the admin roles!`,
    );
  }
}

async function viewCurrentConfiguration(interaction: CommandInteraction) {
  const guild = interaction.guild!;
  const guildId = guild.id;

  const info: Array<{
    name: string;
    value: string;
    inline: boolean;
  }> = [];
  const configuration = await getConfiguration(guildId);

  let stringifiedAdminRoles = '';
  const { adminRoles } = configuration;
  if (adminRoles.length === 0) {
    stringifiedAdminRoles = 'None';
  } else {
    adminRoles.forEach((role) => {
      stringifiedAdminRoles += `${getRoleMention(role)} `;
    });
  }
  info.push({
    name: 'Admin roles',
    value: stringifiedAdminRoles,
    inline: false,
  });

  let stringifiedJoinsoundChannels = '';
  const { joinChannels } = configuration;
  if (joinChannels.length === 0) {
    stringifiedJoinsoundChannels = 'None';
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

  info.push({
    name: 'SaltKing',
    value: configuration.saltKing
      ? getUserMention(configuration.saltKing)
      : 'None',
    inline: false,
  });

  info.push({
    name: 'SaltKing role',
    value: configuration.saltRole
      ? getRoleMention(configuration.saltRole)
      : 'None',
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
  const subcommand = interaction.options.getSubcommand(true) as
    | 'joinsound-channel' // TODO move this to admin/joinsound ?
    | 'adminrole' // TODO move this to their own entire admin command ?
    | 'view'; // TODO make this the entirety of the "config" command?

  if (subcommand === 'joinsound-channel') {
    const activate = interaction.options.getBoolean('activate', true);
    return toggleJoinsoundChannel(interaction, activate);
  }
  if (subcommand === 'adminrole') {
    const role = interaction.options.getRole('role', true);
    const makeAdmin = interaction.options.getBoolean('add', true);
    return toggleAdminRole(interaction, role.id, makeAdmin);
  }
  if (subcommand === 'view') {
    return viewCurrentConfiguration(interaction);
  }
  return null;
}

function registerSlashCommand(builder: SlashCommandBuilder) {
  return builder.addSubcommandGroup((subcommandGroup) => subcommandGroup
    .setName('config')
    .setDescription('View, change and reset configuration of the bot.')
    .addSubcommand((subcommand) => subcommand
      .setName('joinsound-channel')
      .setDescription(
        "Activate or deactivate joinsounds for the voice channel you're connected to",
      )
      .addBooleanOption((option) => option
        .setName('activate')
        .setDescription('If you want to activate or deactivate it.')
        .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('adminrole')
      .setDescription(
        'Add or remove a role that is allowed to use admin commands.',
      )
      .addRoleOption((option) => option
        .setName('role')
        .setDescription('The role you want to add or remove.')
        .setRequired(true))
      .addBooleanOption((option) => option
        .setName('add')
        .setDescription('If you want to add the role, or remove it.')
        .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('view')
      .setDescription('View the current configuration.')));
}
export const config: MagibotAdminSlashCommand = {
  help() {
    return printHelp();
  },
  permissions: [],
  category: commandCategories.util,
  run: runCommand,
  registerSlashCommand,
};
