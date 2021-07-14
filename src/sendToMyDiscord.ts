import { sendException } from './webhooks';

const maxMessageLength = 1950;

export async function catchErrorOnDiscord(message: string) {
	try {
		let idx = 0;
		for (let i = 0; i < message.length; i += maxMessageLength) {
			idx++;
			// I want this to never hit ratelimit, so let's take it slow
			// eslint-disable-next-line no-await-in-loop
			await sendException(
				`${idx}: ${message.substring(i, i + maxMessageLength)}`,
			);
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(error);
	}
}
