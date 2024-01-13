import { ClientUser } from 'discord.js';
import config from './configuration';
import { DeferReply } from './types/command';

export const OWNERID = config.owner;
export const TOKEN = config.tk;
export const APP_ID = config.appId;
export const DETAILED_LOGGING = false;

export const SIGN = 'MagiBot - created by @maybeanerd';

export const adminDeferralType = DeferReply.public;

// eslint-disable-next-line import/no-mutable-exports
export const queueVoiceChannels: Map<string, string> = new Map();

let bot_user: ClientUser;

export function setUser(usr: ClientUser) {
  bot_user = usr;
}

export function user() {
  return bot_user;
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
  // ['185845248163840002', true],
]);

// eslint-disable-next-line no-shadow
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
