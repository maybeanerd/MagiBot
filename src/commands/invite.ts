import { TextChannel } from 'discord.js';
import { commandCategories } from '../types/enums';
import { magibotCommand } from '../types/magibot';

export const inv: magibotCommand = {
	name: 'invite',
	hide: false,
	dev: false,
	async main({ message }) {
		// TODO check if invite activated on server
		// TODO let user define invite length
		const invite = await (message.channel as TextChannel).createInvite({
			reason: `member ${message.author} used invite command`,
		});
		message.channel.send(`Here's an invite link to this channel: ${invite}`);
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
};
