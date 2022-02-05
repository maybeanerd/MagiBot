import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { commandCategories } from '../types/enums';
import { magibotCommand } from '../types/magibot';

const slashCommand = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Returns the round trip time between you and MagiBot!')
	.addStringOption((option) => option
		.setName('optional input')
		.setDescription('Some input just for fun.')
		.setRequired(false))
	.toJSON();

export const ping: magibotCommand = {
	name: 'ping',
	dev: false,
	hide: false,
	main({ message }) {
		const start = Date.now();
		message.channel.send('Pong!').then((newMsg) => {
			const stop = Date.now();
			const diff = stop - start;
			newMsg.edit(`Pong! \nReactiontime: \`(${diff}ms)\``);
		});
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
			const stop = Date.now();
			const diff = stop - interaction.createdAt.getTime();
			await interaction.reply(`Pong! \nReactiontime: \`(${diff}ms)\``);
		},
		definition: slashCommand,
	},
};
