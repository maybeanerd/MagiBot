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

// for shadowbanned servers we want do deny
const shadowbannedGuilds = new Map([
	// rik and stefans server
	['859803064537186334', true],
	// test: teabots : seems to work!
	// ['380669498014957569', true],
]);
const shadowbannedUsers = new Map([
	// rik
	['206502772533624832', true],
	// stefan
	['223967778615459842', true],
	// test nico
	['185845248163840002', true],
]);

export const enum shadowBannedLevel {
  not = 0x0000,
  member = 0x0001,
  guild = 0x1001,
}

export function isShadowBanned(
	userid: string,
	guildid: string,
	guildOwnerId: string,
) {
	if (shadowbannedGuilds.get(guildid) || shadowbannedUsers.get(guildOwnerId)) {
		return shadowBannedLevel.guild;
	}
	if (shadowbannedUsers.get(userid)) {
		return shadowBannedLevel.member;
	}
	return shadowBannedLevel.not;
}
export const shadowBannedSound = 'https://www.myinstants.com/media/sounds/wet-fart_1.mp3';
