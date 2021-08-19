import { MessageEmbedOptions } from 'discord.js';
import si from 'systeminformation';
import { commandCategories } from '../types/enums';
import {
	OWNERID, COLOR, SIGN, user,
} from '../shared_assets';
// eslint-disable-next-line import/no-cycle
import { bot } from '../bot';
import { magibotCommand } from '../types/magibot';

export const stats: magibotCommand = {
	name: 'stats',
	main: async (content, msg) => {
		const info: Array<{
      name: string;
      value: string;
      inline: boolean;
    }> = [];

		const numberOfGuilds = (
      await bot.shard!.fetchClientValues('guilds.size')
    ).reduce((acc: number, guildCount: any) => acc + guildCount, 0) as number;

		const numberOfUsers = (
      await bot.shard!.fetchClientValues('users.size')
    ).reduce((acc: number, userCount: any) => acc + userCount, 0) as number;

		info.push({
			name: 'Number of guilds currently being served',
			value: String(numberOfGuilds),
			inline: false,
		});
		info.push({
			name: 'Number of users currently being served',
			value: String(numberOfUsers),
			inline: false,
		});

		// uptime calc
		const u = bot.uptime || 0;
		let uptime = '';
		// days
		let x = Math.floor(u / 3600000 / 24);
		if (x > 0) {
			uptime += `${x}d : `;
		}
		// hours
		x = Math.floor(u / 3600000) % 24;
		if (x > 0) {
			uptime += `${x}h : `;
		}
		// mins
		x = Math.floor(u / 60000) % 60;
		if (x > 0) {
			uptime += `${x}m : `;
		}
		// secs
		x = Math.floor(u / 1000) % 60;
		if (x > 0) {
			uptime += `${x}s`;
		}
		// enbettung in ausgabe
		info.push({
			name: 'Time since last restart',
			value: uptime,
			inline: false,
		});
		if (msg.author.id === OWNERID) {
			const memInfo = await si.mem();
			const memUsedByProccess = process.memoryUsage().rss;
			info.push({
				name: 'Memory usage:',
				value: `Memory used by this: ${Math.round(
					memUsedByProccess / 1048576,
				)} MB (${Math.round(
					(memUsedByProccess / memInfo.used) * 100,
				)}% of used memory)
Total available memory: ${Math.round(memInfo.total / 1048576)} MB
Used memory: ${Math.round(memInfo.used / 1048576)} MB (${Math.round(
	(memInfo.used / memInfo.total) * 100,
)}%)`,
				inline: false,
			});
		}

		const embed: MessageEmbedOptions = {
			color: COLOR,
			description: 'Here are some stats:',
			fields: info,
			footer: {
				iconURL: user().avatarURL() || '',
				text: SIGN,
			},
		};

		msg.channel.send({ embeds: [embed] });
	},
	ehelp() {
		return [
			{
				name: '',
				value: 'Get some stats from the bot.',
			},
		];
	},
	perm: ['SEND_MESSAGES', 'EMBED_LINKS'],
	admin: false,
	hide: false,
	category: commandCategories.misc,
	dev: false,
};
