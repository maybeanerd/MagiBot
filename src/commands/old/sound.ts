import { GuildMember, Message } from 'discord.js';
import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import { getGlobalUser, getSettings, getUser } from '../../dbHelpers';
import { isShadowBanned, PREFIXES, shadowBannedLevel } from '../../shared_assets';
import { commandCategories } from '../../types/enums';
import { magibotCommand } from '../../types/command';

function printHelp() {
	const info: Array<{ name: string; value: string }> = [];
	info.push({
		name: '(and attach soundfile to this command)',
		value:
      'Set up a joinsound for yourself. Only .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
	});
	info.push({
		name: 'default (and attach soundfile to this command)',
		value:
      'Set up a default joinsound for yourself. This will play for you on every server MagiBot is on, until you override it with a sound there.\nOnly .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
	});
	info.push({
		name: 'rem',
		value: 'Remove your joinsound',
	});
	info.push({
		name: 'rem default',
		value: 'Remove your default joinsound',
	});

	return info;
}

export async function addSound(
	userid: string,
	surl: string | undefined,
	guildID: string,
) {
	const user = await getUser(userid, guildID);
	user.sound = surl;
	await user.save();
	return true;
}

async function addGlobalSound(userId: string, surl: string | undefined) {
	const user = await getGlobalUser(userId);
	user.sound = surl;
	await user.save();
	return true;
}

export async function setDefaultGuildJoinsound(
	guildId: string,
	soundUrl: string | undefined,
) {
	const guild = await getSettings(guildId);
	guild.defaultJoinsound = soundUrl;
	await guild.save();
	return true;
}

export async function validateJoinsound(
	url: string,
	message: Message,
	setDefault: boolean,
	user?: GuildMember,
	defaultForGuildId?: string,
) {
	if (setDefault && user) {
		throw new Error('Cant set default sounds for others!');
	}
	const sound = await ffprobe(url, { path: ffprobeStatic.path }).catch(
		() => {},
	);
	if (!sound) {
		message.reply(
			`you need to use a compatible link or upload the file with the command! For more info use \`${PREFIXES.get(
        message.guild!.id,
			)}.help sound\``,
		);
		return;
	}
	// eslint-disable-next-line prefer-destructuring
	const firstStream = sound.streams[0];
	if (
		firstStream
    && firstStream.codec_name !== 'mp3'
    && firstStream.codec_name !== 'pcm_s16le'
    && firstStream.codec_name !== 'pcm_f32le'
	) {
		message.reply(
			`You need to use a compatible file! For more info use \`${PREFIXES.get(
        message.guild!.id,
			)}.help sound\``,
		);
		return;
	}
	if (!firstStream.duration) {
		message.reply(
			"Failed to calculate the duration of the joinsound you're trying to add.",
		);
		return;
	}
	if (firstStream.duration > 8) {
		message.reply(
			"The joinsound you're trying to add is longer than 8 seconds.",
		);
		return;
	}
	const userId = user ? user.id : message.author.id;
	if (defaultForGuildId) {
		await setDefaultGuildJoinsound(defaultForGuildId, url);
	} else if (setDefault) {
		await addGlobalSound(userId, url);
	} else {
		await addSound(userId, url, message.guild!.id);
	}
	if (defaultForGuildId) {
		message.reply(
			'You successfully changed the default joinsound for this server!',
		);
	} else if (user) {
		message.reply(`You successfully changed ${user}s joinsound!`);
	} else {
		message.reply(
			`You successfully changed your ${setDefault ? 'default ' : ''}joinsound!`,
		);
	}
}

export const sound: magibotCommand = {
	name: 'sound',
	main: async function main({ content, message }) {
		if (!message.guild) {
			return;
		}
		if (
			isShadowBanned(message.author.id, message.guild.id, message.guild.ownerId)
      !== shadowBannedLevel.not
		) {
			message.reply('you cant do this.');
			return;
		}
		const args = content.split(/ +/);
		const command = args[0].toLowerCase();
		if (command === 'rem') {
			const command2 = args[1];
			if (command2 && command2.toLowerCase() === 'default') {
				await addGlobalSound(message.author.id, undefined);
				message.reply('You successfully removed your default joinsound!');
			} else {
				await addSound(message.author.id, undefined, message.guild.id);
				message.reply('You successfully removed your joinsound!');
			}
		} else if (command === 'default') {
			const file = message.attachments.first();
			const fileUrl = file ? file.url : args[1];
			if (fileUrl) {
				await validateJoinsound(fileUrl, message, true);
			} else {
				message.reply(
					`Missing sound or sound URL. Use \`${PREFIXES.get(
						message.guild.id,
					)}.help sound\` for more info.`,
				);
			}
		} else {
			const file = message.attachments.first();
			const fileUrl = file ? file.url : args[0];
			if (fileUrl) {
				await validateJoinsound(fileUrl, message, false);
			} else {
				message.reply(
					`This is not a valid command. If you tried adding a sound, remember to attach the file to the command. Use \`${PREFIXES.get(
						message.guild.id,
					)}.help sound\` for more info.`,
				);
			}
		}
	},
	ehelp() {
		return printHelp();
	},
	admin: false,
	perm: 'SEND_MESSAGES',
	hide: false,
	category: commandCategories.fun,
	dev: false,
};