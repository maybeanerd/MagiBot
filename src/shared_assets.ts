import Discord, { ClientUser } from 'discord.js';
import config from './configuration';

export const OWNERID = config.owner;
export const PREFIX = config.prefix;
export const TOKEN = config.tk;
export const DETAILED_LOGGING = false;
export const DELETE_COMMANDS = false;
export const COLOR = 0x351c75;
export const SUCCESS_COLOR = 0x00ff00;
export const ERROR_COLOR = 0x0000ff;
export const INFO_COLOR = 0x0000ff;
export const SIGN = 'MagiBot - created by T0TProduction#0001';
// eslint-disable-next-line import/no-mutable-exports
export const PREFIXES: Map<string, string> = new Map();
export const queueVoiceChannels: Map<string, string> = new Map();

export function sendNotification(
	info: string,
	type: string,
	msg: Discord.Message,
) {
	let icolor: number | undefined;

	if (type === 'success') {
		icolor = SUCCESS_COLOR;
	} else if (type === 'error') {
		icolor = ERROR_COLOR;
	} else if (type === 'info') {
		icolor = INFO_COLOR;
	} else {
		icolor = COLOR;
	}

	const embed = {
		color: icolor,
		description: info,
	};
	msg.channel.send('', { embed });
}

let bot_user: ClientUser;

export function setUser(usr: ClientUser) {
	bot_user = usr;
}

export function user() {
	return bot_user;
}

export function resetPrefixes() {
	PREFIXES.clear();
}
