import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { MagibotSlashCommand } from '../types/command';

const slashCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Need some help?')
  .setDMPermission(false);

export const help: MagibotSlashCommand = {
  permissions: [],
  async run(interaction: CommandInteraction) {
    await interaction.reply(`Currently there is no specific help. Just play around using \`/\` and see what MagiBot can do!
In the future, this might give some more extended help or link to a wiki.`);
  },
  definition: slashCommand.toJSON(),
};
