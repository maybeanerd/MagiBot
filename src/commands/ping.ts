import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { MagibotSlashCommand } from '../types/command';

const slashCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Returns the round trip time between you and MagiBot!')
  .setDMPermission(false);

export const ping: MagibotSlashCommand = {
  permissions: [],
  async run(interaction: ChatInputCommandInteraction) {
    const stop = new Date();
    const diff = stop.getTime() - interaction.createdAt.getTime();
    await interaction.reply(`Pong! \`(${diff}ms)\``);
  },
  definition: slashCommand.toJSON(),
};
