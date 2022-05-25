import { GuildMember, MessageEmbedOptions } from 'discord.js';
import { COLOR, PREFIXES } from '../../shared_assets';
import {
	findMember, yesOrNo, findRole, asyncWait,
} from '../../helperFunctions';
import { commandCategories } from '../../types/enums';
import { magibotCommand } from '../../types/command';
import {
	getSettings,
	isJoinableVc,
	getAdminRoles,
	getNotChannel,
	setSettings,
	getCommandChannels,
	getPrefix,
	setPrefix,
} from '../../dbHelpers';

async function setBlacklistedUser(
	userid: string,
	guildID: string,
	insert: boolean,
) {
	const settings = await getSettings(guildID);
	const { blacklistedUsers } = settings;
	if (insert) {
		if (!blacklistedUsers.includes(userid)) {
			blacklistedUsers.push(userid);
		}
	} else {
		const index = blacklistedUsers.indexOf(userid);
		if (index > -1) {
			blacklistedUsers.splice(index, 1);
		}
	}
	settings.blacklistedUsers = blacklistedUsers;
	await settings.save();
}

async function setJoinChannel(
	guildID: string,
	cid: string,
	setActive: boolean,
) {
	const settings = await getSettings(guildID);
	const { joinChannels } = settings;
	if (setActive) {
		if (!joinChannels.includes(cid)) {
			joinChannels.push(cid);
		}
	} else {
		const index = joinChannels.indexOf(cid);
		if (index > -1) {
			joinChannels.splice(index, 1);
		}
	}
	settings.joinChannels = joinChannels;
	await settings.save();
}

async function isAdminRole(guildID: string, role: string) {
	const roles = await getAdminRoles(guildID);
	let ret = false;
	roles.forEach((adminRole) => {
		if (role === adminRole) {
			ret = true;
		}
	});
	return ret;
}

async function setAdminRole(guildID: string, roleID: string, insert: boolean) {
	const roles = await getAdminRoles(guildID);
	if (insert) {
		if (!roles.includes(roleID)) {
			roles.push(roleID);
		}
	} else {
		const index = roles.indexOf(roleID);
		if (index > -1) {
			roles.splice(index, 1);
		}
	}
	const settings = { adminRoles: roles };
	return setSettings(guildID, settings);
}

async function isCommandChannel(guildID: string, cid: string) {
	const channels = await getCommandChannels(guildID);
	return channels.includes(cid);
}

async function setCommandChannel(
	guildID: string,
	cid: string,
	insert: boolean,
) {
	const channels = await getCommandChannels(guildID);
	if (insert) {
		if (!channels.includes(cid)) {
			channels.push(cid);
		}
	} else {
		const index = channels.indexOf(cid);
		if (index > -1) {
			channels.splice(index, 1);
		}
	}
	const settings = { commandChannels: channels };
	return setSettings(guildID, settings);
}

async function setNotificationChannel(
	guildID: string,
	notChannel: string | undefined,
) {
	const settings = await getSettings(guildID);
	settings.notChannel = notChannel;
	await settings.save();
}

function printHelp() {
	const info: Array<{ name: string; value: string }> = [];

	info.push({
		name: 'ban <@User>',
		value: 'Deactivate all functions of the bot for a user',
	});
	info.push({
		name: 'unban <@User>',
		value: 'Reactivate all functions of the bot for a user',
	});
	info.push({
		name: 'join',
		value: "(De)activate joinsounds for the voicechannel you're connected to",
	});
	info.push({
		name: 'admin <@Role>',
		value: '(Un)set a role to be considered admin by the bot',
	});
	info.push({
		name: 'command',
		value:
      "(De)activate bot commands for the text channel you're sending this in",
	});
	info.push({
		name: 'notification',
		value: '(Un)set a textchannel to be notification channel',
	});
	info.push({
		name: 'info',
		value: 'Displays current settings',
	});
	info.push({
		name: 'prefix <prefix>',
		value: 'Set a custom character or string as prefix',
	});

	return info;
}

export const setup: magibotCommand = {
	dev: false,
	name: 'setup',
	main: async function main({ content, message }) {
		const args = content.split(/ +/);
		const command = args[0].toLowerCase();

		const mention = args[1];

		// Create variables to use in cases
		let user: GuildMember | null = null;
		let de;
		switch (command) {
		case 'ban':
			user = (await findMember(message.guild!, mention)).user;
			if (mention && user) {
				if (
					await yesOrNo(
						message,
						`Do you really want to ban ${user} from using the bot?`,
						'Successfully canceled ban.',
					)
				) {
					setBlacklistedUser(message.guild!.id, user.id, true);
					message.channel.send(`Successfully banned ${user} from using the bot.`);
				}
			} else {
				message.reply('you need to mention a user you want to use this on!');
			}
			break;
		case 'unban':
			user = (await findMember(message.guild!, mention)).user;
			if (mention && user) {
				if (
					await yesOrNo(
						message,
						`Do you really want to reactivate bot usage for ${user}?`,
						'Successfully canceled unban.',
					)
				) {
					setBlacklistedUser(message.guild!.id, user.id, false);
					message.channel.send(`Successfully banned ${user} from using the bot.`);
				}
			} else {
				message.reply('you need to mention a user you want to use this on!');
			}
			break;
		case 'join':
			// eslint-disable-next-line no-case-declarations
			if (message.member) {
				const voiceChannel = message.member.voice.channel;
				if (voiceChannel) {
					const isJoinable = await isJoinableVc(
              message.guild!.id,
              voiceChannel.id,
					);
					de = '';
					if (isJoinable) {
						de = 'de';
					}
					if (
						await yesOrNo(
							message,
							`Do you want to ${de}activate joinsounds in **${voiceChannel.name}**?`,
							`Cancelled ${de}activating joinsounds in **${voiceChannel.name}**.`,
						)
					) {
						await setJoinChannel(message.guild!.id, voiceChannel.id, !isJoinable);
						message.channel.send(
							`Successfully ${de}activated joinsounds in **${voiceChannel.name}**.`,
						);
					}
				} else {
					message.channel.send("You're connected to no voice channel!");
				}
			}
			break;
		case 'admin':
			if (mention === '@everyone') {
				message.channel.send('You cannot use the everyone role as admin');
				break;
			}
			// eslint-disable-next-line no-case-declarations
			const rid = await findRole(message.guild!, mention);
			if (mention && rid) {
				if (!(await isAdminRole(message.guild!.id, rid))) {
					if (
						await yesOrNo(
							message,
							`Do you want to set <@&${rid}> as admin role?`,
							`Cancelled setting <@&${rid}> as admin role`,
						)
					) {
						await setAdminRole(message.guild!.id, rid, true);
						message.channel.send(`Successfully set <@&${rid}> as admin role!`);
					}
				} else if (
					await yesOrNo(
						message,
						`Do you want to remove <@&${rid}> from the admin roles?`,
						`Cancelled removing <@&${rid}> from the admin roles`,
					)
				) {
					await setAdminRole(message.guild!.id, rid, false);
					message.channel.send(
						`Successfully removed <@&${rid}> from the admin roles!`,
					);
				}
			} else {
				message.channel.send('You need to mention a role!');
			}
			break;
		case 'command':
			// eslint-disable-next-line no-case-declarations
			const currentlyIsCommandChannel = await isCommandChannel(
          message.guild!.id,
          message.channel.id,
			);
			de = '';
			if (currentlyIsCommandChannel) {
				de = 'de';
			}
			if (
				await yesOrNo(
					message,
					`Do you want to ${de}activate commands in <#${message.channel.id}>?`,
					`Cancelled ${de}activating commands in <#${message.channel.id}>`,
				)
			) {
				await setCommandChannel(
            message.guild!.id,
            message.channel.id,
            !currentlyIsCommandChannel,
				);
				message.channel.send(
					`Successfully ${de}activated commands in <#${message.channel.id}>.`,
				);
			}
			break;
		case 'notification':
			// eslint-disable-next-line no-case-declarations
			const isNotChann = message.channel.id === (await getNotChannel(message.guild!.id));

			if (!isNotChann) {
				if (
					await yesOrNo(
						message,
						`Do you want to activate MagiBot notifications in <#${message.channel.id}>?`,
						`Cancelled activating notifications in <#${message.channel.id}>`,
					)
				) {
					await setNotificationChannel(message.guild!.id, message.channel.id);
					const newMessage = await message.channel.send(
						`Successfully activated notifications in <#${message.channel.id}>.`,
					);
					asyncWait(5000).then(() => {
						newMessage.delete();
					});
				}
			} else if (
				await yesOrNo(
					message,
					`Do you want to deactivate MagiBot notifications in <#${message.channel.id}>?`,
					`Cancelled deactivating notifications in <#${message.channel.id}>`,
				)
			) {
				await setNotificationChannel(message.guild!.id, undefined);
				message.channel.send('Successfully deactivated notifications.');
			}
			break;
		case 'prefix':
			if (mention) {
				if (
					await yesOrNo(
						message,
						`Do you want to change the prefix in ${
                message.guild!.name
						} from \`${PREFIXES.get(message.guild!.id)}.\` to \`${mention}.\` ?`,
						'Cancelled changing the prefix.',
					)
				) {
					const success = await setPrefix(message.guild!.id, mention);
					if (success) {
						message.channel.send(
							`Successfully changed prefix to \`${mention}.\` !`,
						);
					} else {
						message.channel.send('Something bad happened...');
					}
				}
			} else {
				message.reply('you need to provide a prefix you want to use.');
			}
			break;
		case 'info':
			/* eslint-disable no-case-declarations */
			const info: Array<{
          name: string;
          value: string;
          inline: boolean;
        }> = [];
			const set = await getSettings(message.guild!.id);

			info.push({
				name: 'Prefix',
				value: `${await getPrefix(message.guild!.id)}.`,
				inline: false,
			});

			let str = '';
			const { commandChannels } = set;
			/* eslint-enable no-case-declarations */

			if (commandChannels.length === 0) {
				str = 'no whitelist, so every channel is allowed';
			} else {
				const { guild } = message;
				commandChannels.forEach((channel) => {
					const chann = guild!.channels.cache.get(channel);
					if (chann && !chann.deleted) {
						str += `<#${channel}> `;
					} else {
						setCommandChannel(guild!.id, channel, false);
					}
				});
			}
			info.push({
				name: 'Command channels',
				value: str,
				inline: false,
			});

			str = '';
			// eslint-disable-next-line no-case-declarations
			const { adminRoles } = set;
			if (adminRoles.length === 0) {
				str = 'Empty';
			} else {
				adminRoles.forEach((role) => {
					str += `<@&${role}> `;
				});
			}
			info.push({
				name: 'Admin roles',
				value: str,
				inline: false,
			});

			str = '';
			// eslint-disable-next-line no-case-declarations
			const { joinChannels } = set;
			if (joinChannels.length === 0) {
				str = 'Empty';
			} else {
				const { guild } = message;
				joinChannels.forEach((channel) => {
					const chann = guild!.channels.cache.get(channel);
					if (chann && !chann.deleted) {
						str += `${chann.name}, `;
					} else {
						setJoinChannel(guild!.id, channel, false);
					}
				});
				str = str.substring(0, str.length - 2);
			}
			info.push({
				name: 'Joinsound channels',
				value: str,
				inline: false,
			});

			str = '';
			// eslint-disable-next-line no-case-declarations
			const { blacklistedUsers } = set;
			if (blacklistedUsers.length === 0) {
				str = 'Empty';
			} else {
				blacklistedUsers.forEach((userId) => {
					str += `<@!${userId}>, `;
				});
				str = str.substring(0, str.length - 2);
			}
			info.push({
				name: 'Blacklisted users',
				value: str,
				inline: false,
			});

			/* str = '';
			const { blacklistedEveryone } = set;
			if (blacklistedEveryone.length === 0) {
			  str = 'Empty';
			} else {
			  blacklistedEveryone.forEach((com) => {
				str += `<#${com}>, `;
			  });
			  str = str.substring(0, str.length - 2);
			}
			info.push({
			  name: 'Channel with @everyone blacklist',
			  value: str,
			  inline: false,
			}); */

			if (!set.saltKing) {
				str = 'Empty';
			} else {
				str = `<@${set.saltKing}>`;
			}
			info.push({
				name: 'SaltKing',
				value: str,
				inline: false,
			});
			if (!set.saltRole) {
				str = 'Empty';
			} else {
				str = `<@&${set.saltRole}>`;
			}
			info.push({
				name: 'SaltKing role',
				value: str,
				inline: false,
			});
			if (!set.notChannel) {
				str = 'Empty';
			} else {
				str = `<#${set.notChannel}>`;
			}
			info.push({
				name: 'Notification channel',
				value: str,
				inline: false,
			});
			/* eslint-disable no-case-declarations */
			/* eslint-disable camelcase */
			const embed: MessageEmbedOptions = {
				color: COLOR,
				description: `Guild settings of ${message.guild!.name}:`,
				fields: info,
				footer: {
					iconURL: message.guild!.iconURL() || '',
					text: message.guild!.name,
				},
			};
			/* eslint-enable no-case-declarations */
			/* eslint-enable camelcase */
			message.channel.send({ embeds: [embed] });
			break;
		default:
			message.reply(
				`this command doesn't exist. Use \`${PREFIXES.get(
            message.guild!.id,
				)}:help setup\` for more info.`,
			);
			break;
		}
	},
	ehelp() {
		return printHelp();
	},
	perm: ['SEND_MESSAGES', 'EMBED_LINKS'],
	admin: true,
	hide: false,
	category: commandCategories.util,
};
