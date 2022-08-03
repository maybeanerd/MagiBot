import { CommandInteraction, GuildMember } from 'discord.js';
import { APIApplicationCommandOptionChoice } from 'discord-api-types/v10';
import { SlashCommandBuilder } from '@discordjs/builders';
import {
  adminDeferralType,
  isShadowBanned,
  shadowBannedLevel,
} from '../../shared_assets';
import { interactionConfirmation } from '../../helperFunctions';
import { MagibotAdminSlashCommand } from '../../types/command';
import {
  JoinsoundOptions,
  removeDefaultGuildJoinsound,
  removeSound,
  validateAndSaveJoinsound,
} from '../joinsound/management';
import { getConfiguration } from '../../dbHelpers';

async function resetAllJoinChannels(guildId: string) {
  const configuration = await getConfiguration(guildId);
  configuration.joinChannels = [];
  await configuration.save();
}

export async function setJoinChannel(
  guildId: string,
  cid: string,
  setActive: boolean,
): Promise<boolean> {
  const configuration = await getConfiguration(guildId);
  const { joinChannels } = configuration;
  let successful = false;
  if (setActive) {
    if (!joinChannels.includes(cid)) {
      joinChannels.push(cid);
      successful = true;
    }
  } else {
    const index = joinChannels.indexOf(cid);
    if (index > -1) {
      joinChannels.splice(index, 1);
      successful = true;
    }
  }
  configuration.joinChannels = joinChannels;
  await configuration.save();
  return successful;
}

async function toggleJoinsoundChannel(
  interaction: CommandInteraction,
  activate: boolean,
) {
  const voiceChannel = (interaction.member as GuildMember).voice.channel;
  if (voiceChannel) {
    const success = await setJoinChannel(
      interaction.guildId!,
      voiceChannel.id,
      activate,
    );
    if (success) {
      interaction.followUp(
        `Successfully ${activate ? '' : 'de'}activated joinsounds in **${
          voiceChannel.name
        }**.`,
      );
    } else {
      interaction.followUp(
        `**${voiceChannel.name}** already has joinsounds ${
          activate ? 'active' : 'disabled'
        }.`,
      );
    }
  } else {
    interaction.followUp("You're not connected to a voice channel!");
  }
}

const acticateJoinsoundsInChannelChoices: Array<
  APIApplicationCommandOptionChoice<string>
> = [
  { name: 'activate joinsounds in connected voicechannel', value: 'activate' },
  { name: 'activate joinsounds everywhere', value: 'activate-all' },
  { name: 'disable joinsounds in connected voicechannel', value: 'disable' },
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
      adminDeferralType,
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
      | 'disable'
      | 'activate-all';
    if (action === 'activate-all') {
      const confirmed = await interactionConfirmation(
        interaction,
        'Do you want to reset configured joinsound-voicechannels? This will activate joinsounds for all voicechannels.',
        adminDeferralType,
      );
      if (!confirmed) {
        return;
      }
      await resetAllJoinChannels(guild.id);
      await confirmed.followUp(
        'Successfully activated joinsounds for all voicechannels!',
      );
    } else {
      await toggleJoinsoundChannel(interaction, action === 'activate');
    }
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
  permissions: [],
  run: runCommand,
  registerSlashCommand,
};
