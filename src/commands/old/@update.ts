import { TextChannel } from 'discord.js';
import { commandCategories } from '../../types/enums';
// eslint-disable-next-line import/no-cycle
import { bot } from '../../bot';
import { magibotCommand } from '../../types/command';
import { asyncForEach, yesOrNo } from '../../helperFunctions';
import { getNotChannel, setSettings } from '../../dbHelpers';

async function sendUpdate(update: string) {
	await asyncForEach(bot.guilds.cache, async (G) => {
		if (G.available) {
			const cid = await getNotChannel(G.id);
			if (cid) {
				const channel = G.channels.cache.get(cid) as TextChannel;
				if (channel && G.me) {
					const perms = channel.permissionsFor(G.me);
					if (perms && perms.has('SEND_MESSAGES')) {
						if (G.id === '380669498014957569') {
							channel.send(`<@&460218236185739264> ${update}`);
						} else {
							channel.send(update);
						}
					}
				} else {
					await setSettings(G.id, { notChannel: undefined });
				}
			}
		}
	});
}

export const update: magibotCommand = {
	ehelp: () => [],
	perm: ['ADMINISTRATOR'],
	name: 'update',
	main: async function main({ content, message }) {
		const confirmed = await yesOrNo(
			message,
			`Do you want to send the update\n${content}`,
			'Successfully canceled update',
			undefined,
			60000,
		);
		if (confirmed) {
			sendUpdate(content);
			message.channel.send(`Successfully sent:\n${content}`);
		}
	},
	admin: true,
	hide: true,
	dev: true,
	category: commandCategories.util,
};
