import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { isShadowBanned, shadowBannedLevel } from '../../shared_assets';
import { DeferReply, MagibotSlashCommand } from '../../types/command';
import {
  getJoinsoundOverviewOfUser,
  JoinsoundOptions,
  removeAllJoinsoundsOfUser,
  removeDefaultSound,
  removeSound,
  validateAndSaveJoinsound,
} from './management';

const slashCommand = new SlashCommandBuilder()
  .setName('joinsound')
  .setDescription('Manage your joinsounds.')
  .setDMPermission(false)
  .addSubcommand((subcommand) => subcommand
    .setName('set')
    .setDescription('Set your joinsound.')
    .addAttachmentOption((option) => option
      .setName(JoinsoundOptions.soundFile)
      .setDescription(
        'The sound you want to use. Mp3 or wav, max length of 8 seconds.',
      )
      .setRequired(true)))
  .addSubcommand((subcommand) => subcommand.setName('remove').setDescription('Remove your joinsound.'))
  .addSubcommand((subcommand) => subcommand
    .setName('set-default')
    .setDescription('Set your default joinsound.')
    .addAttachmentOption((option) => option
      .setName(JoinsoundOptions.soundFile)
      .setDescription(
        'The sound you want to use per default in all guilds. Mp3 or wav, max length of 8 seconds.',
      )
      .setRequired(true)))
  .addSubcommand((subcommand) => subcommand
    .setName('remove-default')
    .setDescription('Remove your default joinsound.'))
  .addSubcommand((subcommand) => subcommand
    .setName('remove-all')
    .setDescription('Remove all of your joinsounds.'))
  .addSubcommand((subcommand) => subcommand
    .setName('overview')
    .setDescription('Get an overview of your joinsound setup.'));

const deferralType = DeferReply.public;

async function runCommand(interaction: ChatInputCommandInteraction) {
  const { user } = interaction.member!;
  const guild = interaction.guild!;
  if (
    isShadowBanned(user.id, guild.id, guild.ownerId) !== shadowBannedLevel.not
  ) {
    interaction.followUp('You cant do this.');
    return;
  }
  const subcommand = interaction.options.getSubcommand(true) as
    | 'set'
    | 'set-default'
    | 'remove'
    | 'remove-default'
    | 'remove-all'
    | 'overview';

  if (subcommand === 'set') {
    const attachment = interaction.options.getAttachment(
      JoinsoundOptions.soundFile,
      true,
    );
    await validateAndSaveJoinsound(attachment, interaction, false);
    return;
  }
  if (subcommand === 'set-default') {
    const attachment = interaction.options.getAttachment(
      JoinsoundOptions.soundFile,
      true,
    );
    await validateAndSaveJoinsound(attachment, interaction, true);
    return;
  }
  if (subcommand === 'remove') {
    await removeSound(user.id, guild.id);
    interaction.followUp('Successfully removed your joinsound!');
    return;
  }
  if (subcommand === 'remove-default') {
    await removeDefaultSound(user.id);
    interaction.followUp('Successfully removed your default joinsound!');
  }
  if (subcommand === 'remove-all') {
    await removeAllJoinsoundsOfUser(interaction, deferralType);
  }
  if (subcommand === 'overview') {
    await getJoinsoundOverviewOfUser(interaction);
  }
}
export const joinsound: MagibotSlashCommand = {
  permissions: [],
  definition: slashCommand.toJSON(),
  run: runCommand,
  defer: deferralType,
};
