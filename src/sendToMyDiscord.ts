import Discord from 'discord.js';
// eslint-disable-next-line import/no-cycle
import { bot } from './bot';

const maxMessageLength = 1950;

export async function catchErrorOnDiscord(message: string) {
	try {
		const chann = await bot.channels.fetch('414809410448261132');
		if (chann) {
			let idx = 0;
			for (let i = 0; i < message.length; i += maxMessageLength) {
				idx++;
				// I want this to never hit ratelimit, so let's take it slow
				// eslint-disable-next-line no-await-in-loop
				await (chann as Discord.TextChannel).send(
					`${idx}: ${message.substring(i, i + maxMessageLength)}`,
				);
			}
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(error);
	}
}
