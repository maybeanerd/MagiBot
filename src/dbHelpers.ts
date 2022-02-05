import { TextChannel, Guild, GuildMember } from 'discord.js';
import {
	SettingsModel,
	UserModel,
	Settings,
	SaltrankModel,
	StillMutedModel,
	GlobalUserDataModel,
} from './db';
import { OWNERID, PREFIXES } from './shared_assets';
import config from './configuration';
import { sendJoinEvent } from './webhooks';

export async function getUser(userid: string, guildID: string) {
	const result = await UserModel.findOneAndUpdate(
		{
			userID: userid,
			guildID,
		},
		{
			$setOnInsert: {
				warnings: 0,
				kicks: 0,
				bans: 0,
				botusage: 0,
				sound: undefined,
			},
		},
		{
			returnOriginal: false,
			upsert: true,
		},
	);
	return result;
}

export async function getGlobalUser(userId: string) {
	const result = await GlobalUserDataModel.findOneAndUpdate(
		{
			userID: userId,
		},
		{
			$setOnInsert: {
				sound: undefined,
			},
		},
		{
			returnOriginal: false,
			upsert: true,
		},
	);
	return result;
}

async function firstSettings(guildID: string) {
	const settings = new SettingsModel({
		_id: guildID,
		commandChannels: [],
		adminRoles: [],
		joinChannels: [],
		blacklistedUsers: [],
		blacklistedEveryone: [],
		saltKing: undefined,
		saltRole: undefined,
		notChannel: undefined,
		prefix: config.prefix,
		lastConnected: new Date(),
	});
	await settings.save();
	return settings;
}

export async function getSettings(guildID: string) {
	let result = await SettingsModel.findById(guildID);
	if (!result) {
		await sendJoinEvent(
			`:wastebasket: couldn't find settings for guild ${guildID} , resetting/setting empty state. Found this:${JSON.stringify(
				result,
				null,
				2,
			)}`,
		);

		result = await firstSettings(guildID);
	}
	return result;
}

export async function getSoundOfUser(userId: string, guildId: string) {
	const user = await getUser(userId, guildId);
	if (user.sound && user.sound !== 'false') {
		return user.sound;
	}
	const defaultUser = await getGlobalUser(userId);
	if (defaultUser.sound && defaultUser.sound !== 'false') {
		return defaultUser.sound;
	}
	const defaultGuildSound = await getSettings(guildId);
	if (
		defaultGuildSound.defaultJoinsound
    && defaultGuildSound.defaultJoinsound !== 'false'
	) {
		return defaultGuildSound.defaultJoinsound;
	}
	return null;
}

export async function checkGuild(id: string) {
	// create settings
	if (await getSettings(id)) {
		return true;
	}
	return false;
}

export async function setSettings(
	guildID: string,
	// this was difficult to find, but is awesome
	update: { [Property in keyof Settings]?: Settings[Property] },
) {
	if (await getSettings(guildID)) {
		await SettingsModel.updateOne({ _id: guildID }, { $set: update });
	}
	return true;
}

async function getSaltKing(guildID: string) {
	const settings = await getSettings(guildID);
	return settings.saltKing;
}

async function getSaltRole(guildID: string) {
	const set = await getSettings(guildID);
	return set.saltRole;
}

async function setSaltRole(guildID: string, roleID: string) {
	await setSettings(guildID, { saltRole: roleID });
}

export async function getNotChannel(guildID: string) {
	const set = await getSettings(guildID);
	return set.notChannel;
}

function setSaltKing(guildID: string, userID: string) {
	return setSettings(guildID, { saltKing: userID });
}

// top 5 salty people
export async function topSalt(guildID: string) {
	const result = await SaltrankModel.find({ guild: guildID })
		.sort({ salt: -1 })
		.limit(5);
	if (!result) {
		return [];
	}
	return result;
}

export async function updateSaltKing(G: Guild) {
	if (G.available && G.me) {
		if (G.me.permissions.has('MANAGE_ROLES', true)) {
			const SaltKing = await getSaltKing(G.id);
			let SaltRole = await getSaltRole(G.id);
			const groles = G.roles;
			if (!SaltRole || !groles.cache.has(SaltRole)) {
				if (G.roles.cache.size < 250) {
					await G.roles
						.create({
							name: 'SaltKing',
							color: '#FFFFFF',
							position: 0,
							permissions: [],
							mentionable: true,
							reason:
                'SaltKing role needed for Saltranking to work. You can adjust this role if you like.',
						})
						.then(async (role) => {
							await setSaltRole(G.id, role.id);
							SaltRole = role.id;
						});
				} else {
					const channel = await getNotChannel(G.id);
					if (channel) {
						const chan = G.channels.cache.get(channel);
						if (chan) {
							const perms = chan.permissionsFor(G.me);
							if (perms && perms.has('SEND_MESSAGES')) {
								const owner = await G.fetchOwner();
								(chan as TextChannel).send(
									`Hey there ${owner}!\nI regret to inform you that this server has 250 roles and I therefore can't add SaltKing. If you want to manage the role yourself delete one and then just change the settings of the role i create automatically.`,
								);
							}
						}
					}
					return;
				}
			}
			const sltID = await topSalt(G.id);
			let saltID: string | undefined;
			if (sltID[0]) {
				saltID = sltID[0].salter;
			}
			if (!SaltRole) {
				throw new Error('For some reason, there was no SaltRole.');
			}
			const role = await groles.fetch(SaltRole);
			if (role && role.position < G.me.roles.highest.position) {
				if (SaltKing && saltID !== SaltKing) {
					const user = await G.members.fetch(SaltKing).catch(() => {});
					if (user) {
						user.roles.remove(SaltRole, 'Is not as salty anymore');
					}
				}
				if (saltID) {
					const nuser = await G.members.fetch(saltID).catch(() => {});
					if (nuser) {
						if (!nuser.roles.cache.has(SaltRole)) {
							await nuser.roles.add(SaltRole, 'Saltiest user');
						}
					}
					if (saltID !== SaltKing) {
						await setSaltKing(G.id, saltID);
					}
				}
			} else {
				const channel = await getNotChannel(G.id);
				if (channel) {
					const chan = G.channels.cache.get(channel);
					if (chan) {
						const perms = chan.permissionsFor(G.me);
						if (perms && perms.has('SEND_MESSAGES')) {
							const owner = await G.fetchOwner();
							(chan as TextChannel).send(
								`Hey there ${owner}!\nI regret to inform you that my highest role is beneath <@&${SaltRole}>, which has the effect that i cannot give or take if from users.`,
							);
						}
					}
				}
			}
		} else {
			const channel = await getNotChannel(G.id);
			if (channel) {
				const chan = G.channels.cache.get(channel);
				if (chan) {
					const perms = chan.permissionsFor(G.me);
					if (perms && perms.has('SEND_MESSAGES')) {
						const owner = await G.fetchOwner();
						(chan as TextChannel).send(
							`Hey there ${owner}!\nI regret to inform you that i have no permission to manage roles and therefore can't manage the SaltKing role.`,
						);
					}
				}
			}
		}
	}
}

export async function isJoinableVc(guildID: string, channelID: string) {
	const settings = await getSettings(guildID);
	return settings.joinChannels.includes(channelID);
}

export async function setPrefix(guildID: string, prefix: string) {
	const success = await setSettings(guildID, {
		prefix,
	});
	if (success) {
		PREFIXES.set(guildID, prefix);
	}
	return success;
}

export async function getPrefix(guildID: string) {
	const settings = await getSettings(guildID);
	const { prefix } = settings;
	if (!prefix) {
		await setPrefix(guildID, config.prefix);
		return config.prefix;
	}
	return prefix;
}

export async function toggleStillMuted(
	userID: string,
	guildID: string,
	add: boolean,
) {
	if (add) {
		const isStillMutedAmount = await StillMutedModel.find({
			userid: userID,
			guildid: guildID,
		}).count();
		if (isStillMutedAmount === 0) {
			const newMute = new StillMutedModel({
				userid: userID,
				guildid: guildID,
			});
			await newMute.save();
		}
	} else {
		await StillMutedModel.deleteMany({
			userid: userID,
			guildid: guildID,
		});
	}
}

export async function getAdminRoles(guildID: string) {
	const settings = await getSettings(guildID);
	return settings.adminRoles;
}

export async function isAdmin(guildID: string, member: GuildMember) {
	// checks for admin and Owner, they can always use
	if (member.permissions.has('ADMINISTRATOR', true)) {
		return true;
	}
	// Owner of bot is always admin hehe
	if (member.id === OWNERID) {
		return true;
	}
	const roles = await getAdminRoles(guildID);
	let ret = false;
	roles.forEach((role) => {
		if (member.roles.cache.has(role)) {
			ret = true;
		}
	});
	return ret;
}

export async function getCommandChannels(guildID: string) {
	const settings = await getSettings(guildID);
	return settings.commandChannels;
}

export async function isBlacklistedUser(userid: string, guildID: string) {
	const settings = await getSettings(guildID);
	const users = settings.blacklistedUsers;
	return users.includes(userid);
}
