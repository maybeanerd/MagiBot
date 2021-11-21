import Discord from 'discord.js';
import { doNothingOnError } from './helperFunctions';

const {
	WEBHOOK_ID_EX,
	WEBHOOK_TOKEN_EX,
	WEBHOOK_ID_JOIN,
	WEBHOOK_TOKEN_JOIN,
	WEBHOOK_ID_BUG,
	WEBHOOK_TOKEN_BUG,
	WEBHOOK_ID_STARTUP,
	WEBHOOK_TOKEN_STARTUP,
} = process.env;
if (
	!(
		WEBHOOK_ID_EX
    && WEBHOOK_TOKEN_EX
    && WEBHOOK_ID_JOIN
    && WEBHOOK_TOKEN_JOIN
    && WEBHOOK_ID_BUG
    && WEBHOOK_TOKEN_BUG
    && WEBHOOK_ID_STARTUP
    && WEBHOOK_TOKEN_STARTUP
	)
) {
	throw new Error('Discord Webhook information is missing.');
}

const exceptionsWebhook = new Discord.WebhookClient({
	id: WEBHOOK_ID_EX,
	token: WEBHOOK_TOKEN_EX,
});
const joinsWebhook = new Discord.WebhookClient({
	id: WEBHOOK_ID_JOIN,
	token: WEBHOOK_TOKEN_JOIN,
});
const bugreportWebhook = new Discord.WebhookClient({
	id: WEBHOOK_ID_BUG,
	token: WEBHOOK_TOKEN_BUG,
});
const startupWebhook = new Discord.WebhookClient({
	id: WEBHOOK_ID_STARTUP,
	token: WEBHOOK_TOKEN_STARTUP,
});

export async function sendException(value: string, shardId?: number) {
	return exceptionsWebhook
		.send(`Shard ${shardId}: ${value}`)
		.catch(doNothingOnError);
}
export async function sendJoinEvent(value: string, shardId?: number) {
	return joinsWebhook
		.send(`Shard ${shardId}: ${value}`)
		.catch(doNothingOnError);
}
export async function sendBugreport(value: string, shardId?: number) {
	return bugreportWebhook
		.send(`Shard ${shardId}: ${value}`)
		.catch(doNothingOnError);
}
export async function sendStartupEvent(
	shardId: number,
	justStartingUp = false,
) {
	return startupWebhook
		.send(
			justStartingUp
				? `Shard ${shardId} is starting...!`
				: `Shard ${shardId} is up!`,
		)
		.catch(doNothingOnError);
}
