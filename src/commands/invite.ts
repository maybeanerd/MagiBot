import { CommandInteraction, Message, TextChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { commandCategories } from '../types/enums';
import { magibotCommand } from '../types/magibot';

const slashCommand = new SlashCommandBuilder()
	.setName('invite')
	.setDescription('Creates a temporary invite link to this channel');

async function main(interaction: CommandInteraction | Message) {
	const invite = await (interaction.channel as TextChannel).createInvite({
		reason: `member ${interaction.member?.user} used invite command`,
	});
	interaction.reply(`Here's an invite link to this channel: ${invite}`);
}

export const invite: magibotCommand = {
	name: 'invite',
	hide: false,
	dev: false,
	main({ message }) {
		return main(message);
	},
	ehelp() {
		return [
			{
				name: '',
				value: 'Create and get an invite link to the guild.',
			},
		];
	},
	perm: ['SEND_MESSAGES', 'CREATE_INSTANT_INVITE'],
	admin: false,
	category: commandCategories.util,
	slashCommand: { main, definition: slashCommand.toJSON() },
};
