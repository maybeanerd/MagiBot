import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { commandCategories } from '../types/enums';
import { MagibotSlashCommand } from '../types/command';

const slashCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Returns the round trip time between you and MagiBot!');

export const ping: MagibotSlashCommand = {
  help() {
    return [
      {
        name: '',
        value: 'Ping the bot and get the response time.',
      },
    ];
  },
  permissions: 'SEND_MESSAGES',
  category: commandCategories.misc,
  async run(interaction: CommandInteraction) {
    const stop = new Date();
    const diff = stop.getTime() - interaction.createdAt.getTime();
    await interaction.reply(`Pong! \`(${diff}ms)\``);
  },
  definition: slashCommand.toJSON(),
};
