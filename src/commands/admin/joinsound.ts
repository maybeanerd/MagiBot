import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember } from 'discord.js';
import { APIApplicationCommandOptionChoice } from 'discord-api-types/v10';
import { isShadowBanned, shadowBannedLevel } from '../../shared_assets';
import { commandCategories } from '../../types/enums';
import { interactionConfirmation } from '../../helperFunctions';
import { MagibotAdminSlashCommand } from '../../types/command';
import {
  JoinsoundOptions,
  removeDefaultGuildJoinsound,
  removeSound,
  validateAndSaveJoinsound,
} from '../joinsound/management';
import { getConfiguration } from '../../dbHelpers';

function printHelp() {
  const info: Array<{ name: string; value: string }> = [];
  info.push({
    name: '<@User|userid|nickname> (and attach soundfile to this command)',
    value:
      'Set up a joinsound for another user. Only .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
  });
  info.push({
    name: 'default (and attach soundfile to this command)',
    value:
      'Set up a default joinsound for users on this server. They can override it by setting their own sound.\nOnly .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
  });
  info.push({
    name: 'rem <@User|userid|nickname>',
    value:
      'Remove the joinsound of a user. If you use nickname it has to be at least three characters long',
  });
  info.push({
    name: 'rem default',
    value: 'Remove the default joinsound of this server.',
  });
  return info;
}

export async function setJoinChannel(
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

const acticateJoinsoundsInChannelChoices: Array<
  APIApplicationCommandOptionChoice<string>
> = [
  { name: 'activate joinsounds', value: 'activate' },
  { name: 'disable joinsounds', value: 'disable' },
];

async function runCommand(interaction: CommandInteraction) {
  const guild = interaction.guild!;
  if (
    isShadowBanned(interaction.member!.user.id, guild.id, guild.ownerId)
    !== shadowBannedLevel.not
  ) {
    interaction.followUp('You cant do this.');
    return;
  }

  const subcommand = interaction.options.getSubcommand(true) as
    | 'set'
    | 'set-default'
    | 'remove'
    | 'remove-default'
    | 'voicechannel';

  if (subcommand === 'set') {
    const user = interaction.options.getUser(JoinsoundOptions.user, true);
    const attachment = interaction.options.getString(
      JoinsoundOptions.directUrl,
      true,
    );
    validateAndSaveJoinsound(attachment, interaction, false, user);
    return;
  }
  if (subcommand === 'set-default') {
    const attachment = interaction.options.getAttachment(
      JoinsoundOptions.soundFile,
      true,
    );
    validateAndSaveJoinsound(
      attachment,
      interaction,
      true,
      undefined,
      guild.id,
    );
    return;
  }
  if (subcommand === 'remove') {
    const user = interaction.options.getUser(JoinsoundOptions.user, true);
    await removeSound(user.id, guild.id);
    interaction.followUp(`You successfully removed ${user}s joinsound!`);
    return;
  }
  if (subcommand === 'remove-default') {
    const confirmed = await interactionConfirmation(
      interaction,
      'Do you want to remove the default joinsound of this server?',
    );
    if (!confirmed) {
      return;
    }
    await removeDefaultGuildJoinsound(guild.id);
    confirmed.followUp(
      'You successfully removed the default joinsound of this server!',
    );
  }
  if (subcommand === 'voicechannel') {
    const action = interaction.options.getString('action', true) as
      | 'activate'
      | 'disable';
    await toggleJoinsoundChannel(interaction, action === 'activate');
  }
}

function registerSlashCommand(builder: SlashCommandBuilder) {
  return builder.addSubcommandGroup((subcommandGroup) => subcommandGroup
    .setName('joinsound')
    .setDescription('Manage joinsounds on this guild.')
    .addSubcommand((subcommand) => subcommand
      .setName('set')
      .setDescription('Set someones joinsound.')
      .addAttachmentOption((option) => option
        .setName(JoinsoundOptions.user)
        .setDescription('The user you want to set the sound for.')
        .setRequired(true))
      .addAttachmentOption((option) => option
        .setName(JoinsoundOptions.directUrl)
        .setDescription(
          'A direct link to the sound you want to use. Max length of 8 seconds.',
        )
        .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('remove')
      .setDescription('Remove someones joinsound.')
      .addUserOption((option) => option
        .setName(JoinsoundOptions.user)
        .setDescription('Remove the joinsound of a user on this guild.')
        .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('set-default')
      .setDescription('Set the default joinsound for this server.')
      .addAttachmentOption((option) => option
        .setName(JoinsoundOptions.soundFile)
        .setDescription(
          'The sound you want to use per default on this guild. Mp3 or wav, max length of 8 seconds.',
        )
        .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('remove-default')
      .setDescription('Remove the default joinsound of this guild.'))
    .addSubcommand((subcommand) => subcommand
      .setName('voicechannel')
      .setDescription(
        "(De-)Activate joinsounds for the voice channel you're connected to.",
      )
      .addStringOption((option) => option
        .setName('action')
        .setDescription('If you want to activate or disable it.')
        .setChoices(...acticateJoinsoundsInChannelChoices)
        .setRequired(true))));
}
export const joinsound: MagibotAdminSlashCommand = {
  help() {
    return printHelp();
  },
  permissions: [],
  category: commandCategories.util,
  run: runCommand,
  registerSlashCommand,
};
