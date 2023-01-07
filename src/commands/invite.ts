import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { MagibotSlashCommand } from '../types/command';

const slashCommand = new SlashCommandBuilder()
  .setName('invite')
  .setDescription('Creates a temporary invite link to this channel')
  .setDMPermission(false);

async function main(interaction: CommandInteraction) {
  const invite = await (interaction.channel as TextChannel).createInvite({
    reason: `member ${interaction.member?.user} used invite command`,
  });
  interaction.reply(`Here's an invite link to this channel: ${invite}`);
}

export const invite: MagibotSlashCommand = {
  permissions: [
    PermissionFlagsBits.CreateInstantInvite,
  ],
  run: main,
  definition: slashCommand.toJSON(),
};
