import { CommandInteraction, TextChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { MagibotSlashCommand } from '../types/command';

const slashCommand = new SlashCommandBuilder()
  .setName('invite')
  .setDescription('Creates a temporary invite link to this channel');

async function main(interaction: CommandInteraction) {
  const invite = await (interaction.channel as TextChannel).createInvite({
    reason: `member ${interaction.member?.user} used invite command`,
  });
  interaction.reply(`Here's an invite link to this channel: ${invite}`);
}

export const invite: MagibotSlashCommand = {
  permissions: ['CREATE_INSTANT_INVITE'],
  run: main,
  definition: slashCommand.toJSON(),
};
