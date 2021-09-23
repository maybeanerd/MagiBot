import { GuildMember, Message } from 'discord.js';
import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import { getGlobalUser, getUser } from '../dbHelpers';
import { isShadowBanned, PREFIXES, shadowBannedLevel } from '../shared_assets';
import { commandCategories } from '../types/enums';
import { magibotCommand } from '../types/magibot';

function printHelp() {
	const info: Array<{ name: string; value: string }> = [];
	info.push({
		name: '(attach soundfile to this command)',
		value:
      'Set up a joinsound for yourself. Only .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
	});
	info.push({
		name: '<Link to audio file>',
		value:
      "Set up a joinsound for yourself. The link shouldn't link to a website, but directly to the file.\nOnly .mp3 and .wav are being supported at the moment.",
	});
	info.push({
		name: 'rem',
		value: 'Remove your joinsound',
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

export async function validateJoinsound(
	url: string,
	message: Message,
	setDefault: boolean,
	user?: GuildMember,
) {
	if (setDefault && user) {
		throw new Error('Cant set default sounds for others!');
	}
	let sound = await ffprobe(url, { path: ffprobeStatic.path }).catch(() => {});
	if (!sound) {
		message.reply(
			`you need to use a compatible link or upload the file with the command! For more info use \`${PREFIXES.get(
        message.guild!.id,
			)}.help sound\``,
		);
		return;
	}
	// eslint-disable-next-line prefer-destructuring
	sound = sound.streams[0];
	if (
		sound.codec_name !== 'mp3'
    && sound.codec_name !== 'pcm_s16le'
    && sound.codec_name !== 'pcm_f32le'
	) {
		message.reply(
			`You need to use a compatible file! For more info use \`${PREFIXES.get(
        message.guild!.id,
			)}.help sound\``,
		);
		return;
	}
	if (sound.duration > 8) {
		message.reply(
			"The joinsound you're trying to add is longer than 8 seconds.",
		);
		return;
	}
	const userId = user ? user.id : message.author.id;
	if (setDefault) {
		await addGlobalSound(userId, url);
	} else {
		await addSound(userId, url, message.guild!.id);
	}
	if (user) {
		message.reply(`You successfully changed ${user}s joinsound!`);
	} else {
		message.reply(
			`You successfully changed your ${setDefault ? 'default ' : ''}joinsound!`,
		);
	}
}

export const sound: magibotCommand = {
	name: 'sound',
	main: async function main(content, msg) {
		if (!msg.guild) {
			return;
		}
		if (
			isShadowBanned(msg.author.id, msg.guild.id, msg.guild.ownerId)
      !== shadowBannedLevel.not
		) {
			msg.reply('you cant do this.');
			return;
		}
		const args = content.split(/ +/);
		const command = args[0].toLowerCase();
		if (command === 'rem') {
			const command2 = args[1];
			if (command2 && command2.toLowerCase() === 'default') {
				await addSound(msg.author.id, undefined, 'default');
				msg.reply('you successfully removed your default joinsound!');
			} else {
				await addSound(msg.author.id, undefined, msg.guild.id);
				msg.reply('you successfully removed your joinsound!');
			}
		} else if (command === 'default') {
			const file = msg.attachments.first();
			const fileUrl = file ? file.url : args[1];
			if (fileUrl) {
				await validateJoinsound(fileUrl, msg, true);
			} else {
				msg.reply(
					`Missing sound or sound URL. Use \`${PREFIXES.get(
						msg.guild.id,
					)}.help sound\` for more info.`,
				);
			}
		} else {
			const file = msg.attachments.first();
			const fileUrl = file ? file.url : args[0];
			if (fileUrl) {
				await validateJoinsound(fileUrl, msg, false);
			} else {
				msg.reply(
					`this is not a valid command. If you tried adding a sound, remember to attach the file to the command. Use \`${PREFIXES.get(
						msg.guild.id,
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
