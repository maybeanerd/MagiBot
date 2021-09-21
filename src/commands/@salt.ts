﻿import { Guild } from 'discord.js';
import { commandCategories } from '../types/enums';
import { PREFIXES } from '../shared_assets';
import { findMember, yesOrNo } from '../helperFunctions';
import { magibotCommand } from '../types/magibot';
import { SaltModel, SaltrankModel } from '../db';
import { updateSaltKing } from '../dbHelpers';
import { saltUp, saltGuild } from './salt';

async function resetSalt(G: Guild) {
	const guildID = G.id;
	await SaltrankModel.deleteMany({ guild: guildID });
	await SaltModel.deleteMany({ guild: guildID });
	await updateSaltKing(G);
}

async function remOldestSalt(userid: string, G: Guild) {
	const guildID = G.id;
	const id = await SaltModel.find({
		salter: userid,
		guild: guildID,
	})
		.sort({ date: 1 })
		.limit(1);
	if (id[0]) {
		// eslint-disable-next-line no-underscore-dangle
		await SaltModel.deleteOne({ _id: id[0]._id });
		saltGuild(userid, guildID, -1);
		updateSaltKing(G);
		return true;
	}
	return false;
}

async function clrSalt(userid: string, G: Guild) {
	const guildID = G.id;
	await SaltModel.deleteMany({
		guild: guildID,
		salter: userid,
	});
	await saltGuild(userid, guildID, 1, true);
	await updateSaltKing(G);
}

function printHelp() {
	const info: Array<{ name: string; value: string }> = [];

	info.push({
		name: 'add <@user|userid|nickname>',
		value: 'Report a user for being salty',
	});

	info.push({
		name: 'rem <@user|userid|nickname>',
		value: 'Remove the oldest salt report of a user',
	});

	info.push({
		name: 'clr <@user|userid|nickname>',
		value: 'Clear all salt of a user',
	});

	info.push({
		name: 'reset',
		value: 'Reset all salt of this guild. Use with caution',
	});

	return info;
}

export const salt: magibotCommand = {
	dev: false,
	name: 'salt',
	main: async function main(content, msg) {
		const args = content.split(/ +/);
		const command = args[0].toLowerCase();
		if (msg.guild) {
			const mention = args[1];
			const { user, fuzzy } = await findMember(msg.guild, mention);
			if (!(mention && user)) {
				if (command === 'reset') {
					if (
						await yesOrNo(
							msg,
							'Do you really want to reset all salt on this server?',
							'Successfully canceled salt reset.',
						)
					) {
						resetSalt(msg.guild);
						msg.channel.send(
							`Successfully reset all salt on **${msg.guild.name}**!`,
						);
					}
					return;
				}
				msg.reply('you need to mention a user you want to use this on!');
				return;
			}
			switch (command) {
			case 'add':
				if (user.user.bot) {
					msg.reply("you can't report bots!");
					return;
				}
				if (fuzzy) {
					const confirm = await yesOrNo(
						msg,
						`Do you want to report ${user} for being a salty bitch?`,
					);
					if (!confirm) {
						return;
					}
				}
				await saltUp(user.id, msg.author.id, msg.guild, true);
				msg.channel.send(
					`Successfully reported ${user} for being a salty bitch!`,
				);
				break;
			case 'rem':
				if (user.user.bot) {
					msg.reply('bots are never salty!');
					return;
				}
				if (fuzzy) {
					const confirm = await yesOrNo(
						msg,
						`Do you want to remove the oldest salt from ${user}?`,
					);
					if (!confirm) {
						return;
					}
				}
				if (await remOldestSalt(user.id, msg.guild)) {
					msg.channel.send(
						`Successfully removed the oldest salt from ${user}!`,
					);
				} else {
					msg.channel.send(`${user} has no salt that could be removed!`);
				}
				break;
			case 'clr':
				if (user.user.bot) {
					msg.reply('bots are never salty!');
					return;
				}
				if (fuzzy) {
					const confirm = await yesOrNo(
						msg,
						`Do you want to clear all salt from ${user}?`,
					);
					if (!confirm) {
						return;
					}
				}
				await clrSalt(user.id, msg.guild);
				msg.channel.send(`Successfully cleared all salt from ${user}!`);
				break;
			default:
				msg.reply(
					`this command doesn't exist. Use \`${PREFIXES.get(
						msg.guild.id,
					)}:help salt\` to get more info.`,
				);
				break;
			}
		} else {
			msg.reply('Commands are only available on guilds.');
		}
	},
	ehelp() {
		return printHelp();
	},
	perm: 'SEND_MESSAGES',
	admin: true,
	hide: false,
	category: commandCategories.util,
};
