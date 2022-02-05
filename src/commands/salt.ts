import { Guild, Message, MessageEmbedOptions } from 'discord.js';
import * as cmds from '../helperFunctions';
import { commandCategories } from '../types/enums';
import { PREFIXES } from '../shared_assets';
import { magibotCommand } from '../types/magibot';
import { SaltModel, SaltrankModel } from '../db';
import { updateSaltKing, topSalt } from '../dbHelpers';

async function saltDowntimeDone(userid1: string, userid2: string) {
	// get newest entry in salt
	const d2 = await SaltModel.find({
		salter: userid1,
		reporter: userid2,
	})
		.sort({ date: -1 })
		.limit(1);
	if (d2[0]) {
		const d1 = new Date();
		const ret = (d1.getTime() - d2[0].date.getTime()) / 1000 / 60 / 60;
		return ret;
	}
	return 2;
}

export async function saltGuild(
	salter: string,
	guildID: string,
	add = 1,
	reset = false,
) {
	const user = await SaltrankModel.findOne({
		salter,
		guild: guildID,
	});
	if (!user) {
		const myobj = new SaltrankModel({
			salter,
			salt: 1,
			guild: guildID,
		});
		await myobj.save();
	} else {
		const slt = user.salt + add;
		if (slt <= 0 || reset) {
			await SaltrankModel.deleteOne({
				salter,
				guild: guildID,
			});
		} else {
			const update = { $set: { salt: slt } };
			await SaltrankModel.updateOne(
				{
					salter,
					guild: guildID,
				},
				update,
			);
		}
	}
}

export async function saltUp(
	salter: string,
	reporter: string,
	guild: Guild,
	admin = false,
) {
	const time = await saltDowntimeDone(salter, reporter);
	if (time > 1 || admin) {
		const date = new Date();
		const myobj = new SaltModel({
			salter,
			reporter,
			date,
			guild: guild.id,
		});
		await myobj.save();
		await saltGuild(salter, guild.id, 1);
		await updateSaltKing(guild);
		return 0;
	}
	return time;
}

// TODO we might want to add even more of the DB logic into here

function printHelp(message: Message) {
	const info: Array<{ name: string; value: string }> = [];
	info.push({
		name: 'add <@user|userid|nickname>',
		value:
      'Report a user being salty. If you use nickname it has to be at least three characters long and unique.\nThis has a 1h cooldown for reporting the same user.',
	});
	info.push({
		name: 'top',
		value: `Displays the top 5 salter in ${message.guild!.name}`,
	});
	return info;
}

export const salt: magibotCommand = {
	main: async function main({ content, message }) {
		const args = content.split(/ +/);
		const command = args[0].toLowerCase();
		if (message.guild) {
			switch (command) {
			case 'add':
				/* eslint-disable no-case-declarations */
				const mention = args[1];
				const { user, fuzzy } = await cmds.findMember(message.guild, mention);
				/* eslint-enable no-case-declarations */
				if (mention && user) {
					if (user.id === message.author.id) {
						message.reply("you can't report yourself!");
						return;
					}
					if (user.user.bot) {
						message.reply("you can't report bots!");
						return;
					}
					if (fuzzy) {
						const confirm = await cmds.yesOrNo(
							message,
							`Do you want to report ${user} for being a salty bitch?`,
						);
						if (!confirm) {
							return;
						}
					}
					const time = await saltUp(user.id, message.author.id, message.guild);
					if (time === 0) {
						message.channel.send(
							`Successfully reported ${user} for being a salty bitch!`,
						);
					} else {
						message.reply(
							`you can report ${user} again in ${
								59 - Math.floor((time * 60) % 60)
							} min and ${60 - Math.floor((time * 60 * 60) % 60)} sec!`,
						);
					}
				} else {
					message.reply('you need to mention a user you want to report!');
				}
				break;
			case 'top':
				/* eslint-disable no-case-declarations */
				const salters = await topSalt(message.guild.id);
				const info: Array<{
            name: string;
            value: string;
            inline: boolean;
          }> = [];
				/* eslint-enable no-case-declarations */
				for (let i = 0; i < 5; i++) {
					let mname = 'User left guild';
					if (salters[i]) {
						// eslint-disable-next-line no-await-in-loop
						const member = await message.guild.members
							.fetch(salters[i].salter)
							.catch(() => {});
						if (member) {
							mname = member.displayName;
						}
						info.push({
							name: `${i + 1}. place: ${mname}`,
							value: `${salters[i].salt} salt`,
							inline: false,
						});
					} else {
						break;
					}
				}
				/* eslint-disable no-case-declarations */
				const embed: MessageEmbedOptions = {
					color: 0xffffff,
					description: `Top 5 salter in ${message.guild.name}:`,
					fields: info,
					footer: {
						iconURL: message.guild.iconURL() || '',
						text: message.guild.name,
					},
				};
				/* eslint-enable no-case-declarations */
				message.channel.send({ embeds: [embed] });
				break;
			default:
				message.reply(
					`this command doesn't exist. Use \`${PREFIXES.get(
						message.guild.id,
					)}.help salt\` for more info.`,
				);
				break;
			}
		} else {
			message.reply('commands are only functional when used in a guild.');
		}
	},
	name: 'salt',
	ehelp(message: Message) {
		return printHelp(message);
	},
	perm: ['SEND_MESSAGES', 'EMBED_LINKS'],
	admin: false,
	hide: false,
	category: commandCategories.fun,
	dev: false,
};
