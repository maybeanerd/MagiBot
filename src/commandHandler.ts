import Discord from 'discord.js';
import Statcord from 'statcord.js';
import { vote } from './commands/old/vote';
import { sound } from './commands/old/sound';
import { randomfact } from './commands/rfact';
// eslint-disable-next-line import/no-cycle
import { stats } from './commands/old/stats';
import { salt } from './commands/old/salt';
// eslint-disable-next-line import/no-cycle
import { bugreport } from './commands/bug';
import { inf as info } from './commands/old/info';
import { invite } from './commands/invite';
import { ping } from './commands/ping';
import { profile } from './commands/old/profile';
import { roll } from './commands/roll';
// eslint-disable-next-line import/no-cycle
import { queue as _queue } from './commands/old/@queue';
import { salt as _salt } from './commands/old/@salt';
import { sound as _sound } from './commands/old/@sound';
import { setup as _setup } from './commands/old/@setup';
// eslint-disable-next-line import/no-cycle
import { update as _update } from './commands/old/@update';
// we allow this cycle once, as the help command also needs to list itself
import { help } from './commands/old/help'; // eslint-disable-line import/no-cycle

import {
	PREFIXES, OWNERID, DELETE_COMMANDS, user,
} from './shared_assets';
// eslint-disable-next-line import/no-cycle
import { catchErrorOnDiscord } from './sendToMyDiscord';
import { magibotCommand } from './types/command';
import {
	isBlacklistedUser,
	getCommandChannels,
	getUser,
	isAdmin,
} from './dbHelpers';
// eslint-disable-next-line import/no-cycle
import { bot } from './bot';
import { asyncWait } from './helperFunctions';

export const commands: { [k: string]: magibotCommand } = {
	_queue,
	_sound,
	_setup,
	_update,
	_salt,
	help,
	salt,
	stats,
	rfact: randomfact,
	sound,
	vote,
	bug: bugreport,
	info,
	invite,
	ping,
	profile,
	roll,
};

async function catchError(error: Error, msg: Discord.Message, command: string) {
	console.error(
		`Caught:\n${error.stack}\nin command ${command} ${msg.content}`,
	);
	await catchErrorOnDiscord(
		`**Command:** ${command} ${msg.content}\n**Caught Error:**\n\`\`\`${error.stack}\`\`\``,
	);

	msg.reply(`something went wrong while using ${command}. The devs have been automatically notified.
	If you can reproduce this, consider using \`/bugreport\` or join the support discord (link via \`${
	msg.guild ? PREFIXES.get(msg.guild.id) : 'k'
}.info\`) to tell us exactly how.`);
}

export async function commandAllowed(guildID: string, channelId?: string) {
	if (!channelId) {
		return false;
	}
	const channels = await getCommandChannels(guildID);
	return channels.length === 0 || channels.includes(channelId);
}

export async function usageUp(userid: string, guildID: string) {
	const usr = await getUser(userid, guildID);
	const updateval = usr.botusage + 1;
	usr.botusage = updateval;
	await usr.save();
}

export async function printCommandChannels(guildID: string) {
	const channels = await getCommandChannels(guildID);
	let out = '';
	channels.forEach((channel: string) => {
		out += ` <#${channel}>`;
	});
	return out;
}

const userCooldowns = new Set<string>();

export async function checkCommand(message: Discord.Message) {
	if (!(message.author && message.guild && message.guild.me)) {
		// check for valid message
		console.error('Invalid message received:', message);
		return;
	}
	// only read guild messages from non-bots
	if (!(!message.author.bot && message.channel.type === 'GUILD_TEXT')) {
		return;
	}
	let isMention: boolean;
	if (
		message.content.startsWith(`<@${user().id}>`)
    || message.content.startsWith(`<@!${user().id}>`)
	) {
		isMention = true;
	} else if (message.content.startsWith(PREFIXES.get(message.guild.id)!)) {
		isMention = false;
	} else {
		return;
	}
	// ignore blacklisted users
	if (await isBlacklistedUser(message.author.id, message.guild.id)) {
		// we dont delete the message because this would delete everything that starts with the prefix
		/*     msg.delete(); */
		return;
	}
	let command: string;
	let content: string;
	if (isMention) {
		command = message.content.split(' ')[1]; // eslint-disable-line prefer-destructuring
		content = message.content
			.split(' ')
			.splice(2, message.content.split(' ').length)
			.join(' ');
		command = `.${command}`;
	} else {
		command = message.content
			.substring(PREFIXES.get(message.guild.id)!.length, message.content.length)
			.split(' ')[0]
			.toLowerCase();
		// delete prefix and command
		content = message.content.slice(
			command.length + PREFIXES.get(message.guild.id)!.length,
		);
		content = content.replace(/^\s+/g, ''); // delete leading spaces
	}
	if (command) {
		let commandVal: string;
		const pre = command.charAt(0);
		const myPerms = (message.channel as Discord.TextChannel).permissionsFor(
			message.guild.me,
		);
		if (pre === '.') {
			command = command.slice(1);
			commandVal = command;
		} else if (pre === ':') {
			command = `_${command.slice(1)}`;
			commandVal = command.slice(1);
			// Check if its an admin command
			// if not you're allowed to use the normal version as admin (in any channel)
			if (!commands[command]) {
				command = command.slice(1);
			}
			// Check if the command exists, to not just spam k: msgs
			if (!commands[command]) {
				return;
			}
			if (
				!(message.member && (await isAdmin(message.guild.id, message.member)))
			) {
				if (myPerms) {
					if (myPerms.has('MANAGE_MESSAGES')) {
						message.delete();
					}
					if (myPerms.has('SEND_MESSAGES')) {
						const reply = await message.reply(
							"you're not allowed to use this command.",
						);
						await asyncWait(5000);
						await reply.delete();
					}
				}
				return;
			}
		} else {
			return;
		}

		if (
			commands[command]
      && (!commands[command].dev || message.author.id === OWNERID)
		) {
			if (
				pre === ':'
        || (await commandAllowed(message.guild.id, message.channel.id))
			) {
				const perms = commands[command].perm;
				if (!perms || (myPerms && myPerms.has(perms))) {
					// cooldown for command usage
					if (!userCooldowns.has(message.author.id)) {
						userCooldowns.add(message.author.id);
						setTimeout(() => {
							userCooldowns.delete(message.author.id);
						}, 4000);
						try {
							Statcord.ShardingClient.postCommand(
								command,
								message.author.id,
								bot,
							);
							await commands[command].main({ content, message });
						} catch (err) {
							catchError(
                err as Error,
                message,
                `${PREFIXES.get(message.guild.id)}${pre}${commandVal}`,
							);
						}
						usageUp(message.author.id, message.guild.id);
					} else if (myPerms && myPerms.has('SEND_MESSAGES')) {
						message.reply("whoa cool down, you're using commands too quick!");
					}
					// endof cooldown management
				} else if (myPerms && myPerms.has('SEND_MESSAGES')) {
					message.channel.send(
						`I don't have all the permissions needed for this command: (${perms}) `,
					);
				}
			} else if (myPerms && myPerms.has('SEND_MESSAGES')) {
				if (myPerms && myPerms.has('MANAGE_MESSAGES')) {
					message.delete();
				}
				const reply = await message.reply(
					`commands aren't allowed in <#${
						message.channel.id
					}>. Use them in ${await printCommandChannels(
						message.guild.id,
					)}. If you're an admin use \`${PREFIXES.get(
						message.guild.id,
					)}:help\` to see how you can change that.`,
				);
				await asyncWait(15000);
				await reply.delete();
			}
		}
	}

	if (DELETE_COMMANDS) message.delete();
}
