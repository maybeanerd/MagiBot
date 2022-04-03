import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { interactionConfirmation } from '../helperFunctions';
import { commandCategories } from '../types/enums';
import { MagibotSlashCommand } from '../types/command';
import { sendBugreport } from '../webhooks';

const slashCommand = new SlashCommandBuilder()
	.setName('bugreport')
	.setDescription('Report a bug concerning MagiBot')
	.addStringOption((option) => option
		.setName('description')
		.setDescription(
			'Describe what you did, what was expected, and what went wrong',
		)
		.setRequired(true));

async function main(interaction: CommandInteraction, input: string) {
	const confirmed = await interactionConfirmation(
		interaction,
		`Do you want to send this bugreport?\n${input}`,
		'Successfully cancelled bugreport.',
	);
	if (confirmed) {
		await sendBugreport(
			`**Bugreport** by ${interaction.member?.user.username} (<@${
				interaction.member?.user.id
			}>) on server ${interaction.guild!.name}( ${
        interaction.guild!.id
			} ) :\n${input}`,
		);
		await confirmed.reply({
			content: `Successfully sent bugreport:\n${input}`,
		});
	}
}

export const bugreport: MagibotSlashCommand = {
	help() {
		return [
			{
				name: '<bugreport with information about what you did, what was expected, and what went wrong>',
				value: 'Report a bug concerning MagiBot',
			},
		];
	},
	permissions: 'SEND_MESSAGES',
	category: commandCategories.misc,
	async run(interaction: CommandInteraction) {
		const input = interaction.options.getString('description', true);
		return main(interaction, input);
	},
	definition: slashCommand.toJSON(),
};
