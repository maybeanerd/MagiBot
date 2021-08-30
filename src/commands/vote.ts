﻿import { asyncForEach } from '../bamands';
import { commandCategories } from '../types/enums';
import { magibotCommand } from '../types/magibot';
import { Vote, VoteModel } from '../db';

const reactions = [
	'🇦',
	'🇧',
	'🇨',
	'🇩',
	'🇪',
	'🇫',
	'🇬',
	'🇭',
	'🇮',
	'🇯',
	'🇰',
	'🇱',
	'🇲',
	'🇳',
	'🇴',
	'🇵',
	'🇶',
	'🇷',
	'🇸',
	'🇹',
];

function getTime(content: string) {
	const regex = /^(?:(\d+)d\s*?)?(?:(\d+)h\s*?)?(?:(\d+)m\s*?)?$/;
	const matched = content.match(regex);
	if (matched) {
		const d = parseInt(matched[1], 10) || 0;
		const h = parseInt(matched[2], 10) || 0;
		const m = parseInt(matched[3], 10) || 0;
		if (d + h + m > 0) {
			return [d, h, m];
		}
		return false;
	}
	return false;
}

async function addVote(vote: Vote) {
	const voteCreated = new VoteModel(vote);
	await voteCreated.save();
	return voteCreated.toObject();
}

export const vote: magibotCommand = {
	name: 'vote',
	dev: false,
	main(content, msg) {
		const authorID = msg.author.id;
		msg.channel.send('What do you want the vote to be about?').then((mess) => {
			msg.delete();
			msg.channel
				.awaitMessages({
					filter: (m) => m.author.id === authorID,
					max: 1,
					time: 60000,
				})
				.then((collected) => {
					if (collected.first()) {
						const topic = collected.first()!.content;
            collected.first()!.delete();
            mess.delete();
            msg.channel
            	.send(
            		'How long is this vote supposed to last? (use d h m format, e.g.: `2d 3h 5m`)',
            	)
            	.then((mess1) => {
            		msg.channel
            			.awaitMessages({
            				filter: (m) => m.author.id === authorID,
            				max: 1,
            				time: 60000,
            			})
            			.then((collected2) => {
            				if (collected2.first() && collected2.first()!.content) {
            					// time as array of values
            					const time = getTime(collected2.first()!.content);
                      collected2.first()!.delete();
                      mess1.delete();
                      // do checks on time validity
                      if (!time) {
                      	msg.channel.send('Please use a valid time.');
                      	return;
                      }
                      if (
                      	time[0] > 7
                        || (time[0] > 6 && (time[1] > 0 || time[2] > 0))
                      ) {
                      	msg.channel.send(
                      		'Votes are not allowed to last longer than 7 days, please use a valid time.',
                      	);
                      	return;
                      }
                      msg.channel
                      	.send(
                      		`What do you want the options to be for **${topic}**? Use \`option1|option2[|etc...]\``,
                      	)
                      	.then((mess2) => {
                      		msg.channel
                      			.awaitMessages({
                      				filter: (m) => m.author.id === authorID,
                      				max: 1,
                      				time: 60000,
                      			})
                      			.then((collected3) => {
                      				if (collected3.first()) {
                      					const args = collected3
                      						.first()!
                      						.content.split('|');
                                collected3.first()!.delete();
                                mess2.delete();
                                if (args[0] && args.length <= 20) {
                                	let str = '';
                                	args.forEach((v, i) => {
                                		str += `${reactions[i]} ${v}\n`;
                                	});
                                	let timestr = '';
                                	const times = ['days ', 'hours ', 'minutes '];
                                	time.forEach((v, s) => {
                                		if (v > 0) {
                                			timestr += `${v} ${times[s]}`;
                                		}
                                	});
                                	msg.channel
                                		.send(
                                			`Do you want to start the vote **${topic}** lasting **${timestr}**with the options\n${str}`,
                                		)
                                		.then((mess3) => {
                                			const filter = (reaction, user) => (reaction.emoji.name === '☑'
                                          || reaction.emoji.name === '❌')
                                        && user.id === authorID;
                                			mess3.react('☑');
                                			mess3.react('❌');
                                			mess3
                                				.awaitReactions({
                                					filter,
                                					max: 1,
                                					time: 20000,
                                				})
                                				.then((reacts) => {
                                					mess3.delete();
                                					if (
                                						reacts.first()
                                            && reacts.first()!.emoji.name === '☑'
                                					) {
                                						const dat = new Date();
                                						const date = new Date(
                                							dat.getFullYear(),
                                							dat.getMonth(),
                                							dat.getDate() + time[0],
                                							dat.getHours() + time[1],
                                							dat.getMinutes() + time[2],
                                							dat.getSeconds(),
                                							0,
                                						);
                                						msg.channel
                                							.send(
                                								`**${topic}**\n*by ${msg.author}, ends on ${date}*\n\n${str}`,
                                							)
                                							.then(async (ms) => {
                                								asyncForEach(
                                									args,
                                									async (val, i) => {
                                										await ms.react(
                                											reactions[i],
                                										);
                                									},
                                								);
                                								// vote structure
                                								const vt: Vote = {
                                									messageID: ms.id,
                                									channelID: ms.channel.id,
                                									options: args,
                                									topic,
                                									date,
                                									guildid: ms.guild!.id,
                                									authorID,
                                								};
                                								await addVote(vt);
                                							});
                                					} else if (reacts.first()) {
                                						msg.channel.send(
                                							`successfully canceled vote **${topic}**`,
                                						);
                                					} else {
                                						msg.channel.send(
                                							'canceled vote due to timeout.',
                                						);
                                					}
                                				});
                                		});
                                } else if (!args) {
                                	msg.channel.send(
                                		'Please try again and add some options',
                                	);
                                } else {
                                	msg.channel.send(
                                		'There are only up to 20 options allowed, please try again with less options',
                                	);
                                }
                      				} else {
                      					msg.channel.send(
                      						'canceled vote due to timeout.',
                      					);
                      				}
                      			});
                      	});
            				} else {
            					msg.channel.send('canceled vote due to timeout.');
            				}
            			});
            	});
					} else {
						msg.channel.send('canceled vote due to timeout.');
					}
				});
		});
	},
	ehelp() {
		return [
			{
				name: '',
				value:
          'Start a vote with up to 20 different options. The maximum duration is 7 days.\nThe setup includes multiple steps which will be explained when you use the command.',
			},
		];
	},
	admin: false,
	hide: false,
	perm: ['SEND_MESSAGES', 'MANAGE_MESSAGES'],
	category: commandCategories.util,
};
