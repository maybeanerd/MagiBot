import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { getUserMention, interactionConfirmation } from '../helperFunctions';
import { MagibotSlashCommand } from '../types/command';
import { sendBugreport } from '../webhooks';

const slashCommand = new SlashCommandBuilder()
  .setName('bugreport')
  .setDescription('Report a bug concerning MagiBot')
  .setDMPermission(false)
  .addStringOption((option) => option
    .setName('description')
    .setDescription(
      'Describe what you did, what was expected, and what went wrong',
    )
    .setRequired(true));

async function main(interaction: ChatInputCommandInteraction, input: string) {
  const confirmed = await interactionConfirmation(
    interaction,
    `Do you want to send this bugreport?\n${input}`,
    false,
    'Successfully cancelled bugreport.',
  );
  if (confirmed) {
    await sendBugreport(
      `**Bugreport** by ${interaction.member?.user.username} (${getUserMention(
        interaction.member?.user.id,
      )}) on server ${interaction.guild!.name}( ${interaction.guild!.id
      } ) :\n${input}`,
    );
    await confirmed.followUp({
      content: `Successfully sent bugreport:\n${input}`,
    });
  }
}

export const bugreport: MagibotSlashCommand = {
  permissions: [],
  async run(interaction: ChatInputCommandInteraction) {
    const input = interaction.options.getString('description', true);
    return main(interaction, input);
  },
  definition: slashCommand.toJSON(),
};
