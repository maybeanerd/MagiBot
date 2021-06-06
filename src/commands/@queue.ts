import {
	TextChannel,
	VoiceChannel,
	User,
	Message,
	Guild,
	Snowflake,
	GuildMember,
	ReactionCollector,
} from 'discord.js';
// eslint-disable-next-line import/no-cycle
import { bot } from '../bot';
import { yesOrNo, doNothingOnError } from '../bamands';
import { user, queueVoiceChannels } from '../shared_assets';
import { commandCategories } from '../types/enums';
import { userJoinedQueue } from '../statTracking';
import { magibotCommand } from '../types/magibot';
import { isAdmin, toggleStillMuted } from '../dbHelpers';

const used: { [k: string]: { date: Date; msg: string; cid: string } } = {};

function messageEdit(
	voiceChannel: VoiceChannel | null | undefined,
	activeUser: User | undefined,
	queuedUsers: Array<User>,
	topic: string,
) {
	let msg = `Queue: **${topic}**`;
	if (voiceChannel) {
		msg += `\n*with voicemode activated in* ${voiceChannel}`;
	}
	let nextUsers = '\n';
	if (queuedUsers.length > 0) {
		for (let i = 0; i < 10 && i < queuedUsers.length; i++) {
			nextUsers += `- ${queuedUsers[i]}\n`;
		}
	} else {
		nextUsers = ' no more queued users\n';
	}
	return `${msg}\n*${queuedUsers.length} queued users left*\n\nCurrent user: **${activeUser}**\n\nNext up are:${nextUsers}\nUse ☑ to join and ❌ to leave the queue!`;
}

function askQuestion(
	channel: TextChannel,
	authorID: Snowflake,
	question: string,
) {
	return channel.send(question).then((questionMessage) => channel
		.awaitMessages((message) => message.author.id === authorID, {
			max: 1,
			time: 60000,
		})
		.then((collected) => {
			questionMessage.delete().catch(doNothingOnError);
			const firstCollected = collected.first();
			if (firstCollected) {
				firstCollected.delete().catch(doNothingOnError);
			} else {
				channel
					.send('Cancelled queue creation due to timeout.')
					.catch(doNothingOnError);
				delete used[channel.guild!.id];
				return null;
			}
			return collected;
		}));
}

async function getQueueTopic(
	guild: Guild,
	channel: TextChannel,
	authorID: Snowflake,
): Promise<string | null> {
	return askQuestion(
		channel,
		authorID,
		'What do you want the queue to be about?',
	).then((collected) => {
		if (!collected) {
			return null;
		}
		const topic = collected.first()!.content;
    collected.first()!.delete().catch(doNothingOnError);
    if (topic.length > 1000) {
    	channel.send(
    		'Oops, your topic seems to be larger than 1000 characters. Discord message sizes are limited, so please shorten your topic.',
    	);
    	delete used[guild!.id];
    	return null;
    }
    return topic;
	});
}

async function getQueueTimeout(
	guild: Guild,
	channel: TextChannel,
	author: GuildMember,
): Promise<null | number> {
	return askQuestion(
		channel,
		author.id,
		'How long is this queue supposed to last? *(in minutes, maximum of 120)*',
	).then((collected) => {
		if (!collected) {
			return null;
		}
		let time = parseInt(collected.first()!.content, 10);
		if (!time) {
			channel.send(
				"That's not a real number duh. Cancelled queue creation, try again.",
			);
			delete used[guild!.id];
			return null;
		}
		if (time > 120) {
			time = 120;
		} else if (time < 1) {
			time = 1;
		}
		return time;
	});
}

async function startQueue(
	guild: Guild,
	channel: TextChannel,
	message: Message,
	author: GuildMember,
	topic: string,
	time: number,
) {
	let voiceChannel: VoiceChannel | null | undefined = author.voice.channel;
	let remMessage;
	if (voiceChannel) {
		const botMember = await guild!.members.fetch(user());
		if (!botMember.hasPermission('MUTE_MEMBERS')) {
			remMessage = await channel.send(
				'If i had MUTE_MEMBERS permission i would be able to (un)mute users in the voice channel automatically. If you want to use that feature restart the command after giving me the additional permissions.',
			);
			voiceChannel = null;
		} else if (
			await yesOrNo(
				message,
				`Do you want to automatically (un)mute users based on their turn in ${voiceChannel}? `,
			)
		) {
			remMessage = await message.channel.send(
				`Automatically (un)muting users in ${voiceChannel}. This means everyone except users that are considered admin by MagiBot is muted by default.`,
			);
		} else {
			remMessage = await message.channel.send(
				`Deactivated automatic (un)muting in ${voiceChannel}.`,
			);
			voiceChannel = null;
		}
	} else {
		remMessage = await message.channel.send(
			'If you were in a voice channel while setting this up i could automatically (un)mute users. Restart the whole process to do so, if you wish to.',
		);
	}

	if (
		!(await yesOrNo(
			message,
			`Do you want to start the queue **${topic}** lasting **${time} minutes** ?`,
			`Successfully canceled queue **${topic}**`,
			`Cancelled queue creation of **${topic}** due to timeout.`,
		).finally(() => remMessage.delete().catch(doNothingOnError)))
	) {
		delete used[guild!.id];
		return false;
	}
	return voiceChannel;
}

function onReaction(
	guild: Guild,
	channel: TextChannel,
	voiceChannel: VoiceChannel,
	topicMessage: Message,
	topic: string,
	collector: ReactionCollector,
) {
	const queuedUsers: Array<User> = [];
	let activeUser: User | undefined;

	return async (reactionEvent, reactionUser) => {
		switch (reactionEvent.emoji.name) {
		case '☑':
			if (
				!queuedUsers.includes(reactionUser)
          && reactionUser !== activeUser
          && !reactionEvent.me
			) {
				userJoinedQueue();
				if (activeUser) {
					queuedUsers.push(reactionUser);
					const reactDeclined = topicMessage.reactions.cache.get('❌');
					if (reactDeclined) {
						reactDeclined.users.remove(reactionUser).catch(doNothingOnError);
					}
				} else {
					activeUser = reactionUser;
					reactionEvent.users.remove(activeUser);
					channel.send(`It's your turn ${activeUser}!`).then((ms) => {
						ms.delete({ timeout: 1000 });
					});
					if (voiceChannel) {
						// unmute currentUser
						const currentMember = await guild!.members.fetch(reactionUser);
						if (currentMember) {
							currentMember.voice
								.setMute(false, 'Its their turn in the queue')
								.catch(doNothingOnError);
						}
					}
				}
				topicMessage
					.edit(messageEdit(voiceChannel, activeUser, queuedUsers, topic))
					.catch(doNothingOnError);
			}
			break;
		case '➡':
			if (queuedUsers[0]) {
				if (voiceChannel) {
					// mute old current user
					if (activeUser) {
						const currentMember = await guild!.members.fetch(activeUser);
						currentMember.voice
							.setMute(true, 'its not your turn in the queue anymore')
							.catch(doNothingOnError);
					}
				}
				activeUser = queuedUsers.shift()!;
				topicMessage
					.edit(messageEdit(voiceChannel, activeUser, queuedUsers, topic))
					.catch(doNothingOnError);
				const reactConfirm = topicMessage.reactions.cache.get('☑');
				if (reactConfirm) {
					reactConfirm.users.remove(activeUser).catch(doNothingOnError);
				}
				channel.send(`It's your turn ${activeUser}!`).then((ms) => {
					ms.delete({ timeout: 1000 });
				});
				if (voiceChannel) {
					// unmute currentUser
					const currentMember = await guild!.members.fetch(activeUser);
					if (currentMember) {
						currentMember.voice
							.setMute(false, 'Its their turn in the queue')
							.catch(doNothingOnError);
					}
				}
			} else {
				channel.send('No users left in queue.').then((ms) => {
					ms.delete({ timeout: 2000 });
				});
			}
			reactionEvent.users.remove(reactionUser);
			break;
		case '❌':
			if (queuedUsers.includes(reactionUser) && !reactionEvent.me) {
				const reactConfirm = topicMessage.reactions.cache.get('☑');
				if (reactConfirm) {
					reactConfirm.users.remove(reactionUser).catch(doNothingOnError);
				}
				const ind = queuedUsers.findIndex(
					(obj) => obj.id === reactionUser.id,
				);
				queuedUsers.splice(ind, 1);
				topicMessage
					.edit(messageEdit(voiceChannel, activeUser, queuedUsers, topic))
					.catch(doNothingOnError);
			}
			break;
		case '🔚':
			channel.send('Successfully ended queue.').then((ms) => {
				ms.delete({ timeout: 5000 });
			});
			collector.stop();
			break;
		default:
			break;
		}
		reactionEvent.users.remove(reactionUser);
	};
}

function onEnd(
	guild: Guild,
	voiceChannel: VoiceChannel,
	debugMessage: Message | null,
	topicMessage: Message,
	topic: string,
) {
	return () => {
		if (debugMessage) {
			debugMessage.delete().catch(doNothingOnError);
		}
		delete used[guild.id];
		if (voiceChannel) {
			delete queueVoiceChannels[guild.id];
			// remove all mutes
			voiceChannel.members.array().forEach((member) => {
				// make sure users will be unmuted even if this unmute loop
				// fails because they left the voice channel too quickly
				toggleStillMuted(member.id, guild.id, true)
					.then(() => member.voice.setMute(false, 'queue ended'))
					.then(() => toggleStillMuted(member.id, guild.id, false))
					.catch(doNothingOnError);
			});
		}
		topicMessage.edit(`**${topic}** ended.`).catch(doNothingOnError);
		topicMessage.reactions.removeAll().catch(doNothingOnError);
	};
}

async function createQueue(
	guild: Guild,
	channel: TextChannel,
	message: Message,
	author: GuildMember,
) {
	const topic = await getQueueTopic(guild, channel, author.id);
	if (!topic) {
		return;
	}

	let time = await getQueueTimeout(guild, channel, author);
	if (!time) {
		return;
	}

	const startQueueValue = await startQueue(
		guild,
		channel,
		message,
		author,
		topic,
		time,
	);
	if (startQueueValue === false) {
		return;
	}
	const voiceChannel = startQueueValue as VoiceChannel;
	time *= 60000;

	const topicMessage = await channel.send(
		`Queue: **${topic}:**\n\nUse ☑ to join the queue!`,
	);
	const debugChannel = await bot.channels
		.fetch('433357857937948672')
		.catch(doNothingOnError);
	await topicMessage.react('➡');
	await topicMessage.react('☑');
	await topicMessage.react('❌');
	await topicMessage.react('🔚');
	const filter = (reaction, usr) => reaction.emoji.name === '☑'
    || reaction.emoji.name === '❌'
    || ((reaction.emoji.name === '➡' || reaction.emoji.name === '🔚')
      && usr.id === author.id);

	const collector = topicMessage.createReactionCollector(filter, {
		time,
	});
	let debugMessage: Message | null = null;
	if (debugChannel) {
		debugMessage = await (debugChannel as TextChannel).send(
			`Started queue **${topic}** on server **${topicMessage.guild}**`,
		);
	}
	used[guild!.id] = {
		date: new Date(Date.now() + time),
		cid: topicMessage.channel.id,
		msg: topicMessage.id,
	};

	if (voiceChannel) {
		// add the vc to the global variable so joins get muted
		queueVoiceChannels[guild!.id] = voiceChannel.id;
		// servermute all users in voiceChannel
		const voiceChannelMembers = voiceChannel.members.array();
		voiceChannelMembers.forEach(async (member) => {
			if (member && !(await isAdmin(guild!.id, member))) {
				member.voice
					.setMute(true, 'Queue started in this voice channel')
					.catch(doNothingOnError);
			}
		});
	}

	collector.on(
		'collect',
		onReaction(guild, channel, voiceChannel, topicMessage, topic, collector),
	);

	collector.on(
		'end',
		onEnd(guild, voiceChannel, debugMessage, topicMessage, topic),
	);
}

export const queue: magibotCommand = {
	hide: false,
	name: 'queue',
	async main(content, message) {
		if (
			!message.guild
      || !(message.channel instanceof TextChannel)
      || !message.member
		) {
			return;
		}
		const { guild, member: author, channel } = message;
		if (used[guild.id]) {
			const d = new Date();
			if (d.getTime() - used[guild.id].date.getTime() <= 0) {
				// check if its already 2hours old
				if (used[guild.id].msg && used[guild.id].cid) {
					const previousChannel = guild.channels.cache.get(used[guild.id].cid);
					if (
						previousChannel
            && (await (previousChannel as TextChannel).messages
            	.fetch(used[guild.id].msg)
            	.catch(doNothingOnError))
					) {
						channel
							.send(
								"There's already an ongoing queue on this guild. For performance reasons only one queue per guild is allowed.",
							)
							.catch(doNothingOnError);
						return;
					}
				} else {
					channel
						.send(
							"There's currently a queue being created on this guild. For performance reasons only one queue per guild is allowed.",
						)
						.catch(doNothingOnError);
					return;
				}
			}
		}
		used[guild.id] = {
			date: new Date(Date.now() + 3600000),
			msg: '',
			cid: '',
		};

		message.delete().catch(doNothingOnError);

		await createQueue(guild, channel, message, author);
	},
	ehelp() {
		return [
			{
				name: '',
				value:
          'Start a queue that can last up to 2h. There is only a single queue allowed per guild.\nYou can activate an optional voicemode which will automatically (un)mute users if you start the queue while connected to a voicechannel.\nYou get all the setup instructions when using the command.',
			},
		];
	},
	admin: true,
	perm: ['SEND_MESSAGES', 'MANAGE_MESSAGES'],
	dev: false,
	category: commandCategories.util,
};
