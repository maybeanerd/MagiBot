import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { notifyAboutSlashCommand } from '../helperFunctions';
import { commandCategories } from '../types/enums';
import { magibotCommand } from '../types/magibot';

const slashCommand = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Returns the round trip time between you and MagiBot!');
export const ping: magibotCommand = {
	name: 'ping',
	dev: false,
	hide: false,
	async main({ message }) {
		return notifyAboutSlashCommand(message, 'ping');
	},
	ehelp() {
		return [
			{
				name: '',
				value: 'Ping the bot and get the response time.',
			},
		];
	},
	perm: 'SEND_MESSAGES',
	admin: false,
	category: commandCategories.misc,
	slashCommand: {
		async main(interaction: CommandInteraction) {
			const stop = new Date();
			const diff = stop.getTime() - interaction.createdAt.getTime();
			await interaction.reply(`Pong! \`(${diff}ms)`);
		},
		definition: slashCommand.toJSON(),
	},
};
