import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import { getUser } from '../dbHelpers';
import { isShadowBanned, PREFIXES, shadowBannedLevel } from '../shared_assets';
import { commandCategories } from '../types/enums';
import { magibotCommand } from '../types/magibot';

function printHelp() {
	const info: Array<{ name: string; value: string }> = [];
	info.push({
		name: '(attach soundfile to this command)',
		value:
      'Setup a joinsound for yourself. Only .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
	});
	info.push({
		name: '<Link to audio file>',
		value:
      "Setup a joinsound for yourself. The link shouldn't link to a website, but directly to the file.\nOnly .mp3 and .wav are being supported at the moment.",
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

export const sound: magibotCommand = {
	name: 'sound',
	main: async function main(content, msg) {
		if (!msg.guild) {
			return;
		}
		if (
			isShadowBanned(msg.author.id, msg.guild.id, msg.guild.ownerID)
      !== shadowBannedLevel.not
		) {
			msg.reply('you cant do this.');
			return;
		}
		const args = content.split(/ +/);
		const command = args[0].toLowerCase();
		if (command === 'rem') {
			await addSound(msg.author.id, undefined, msg.guild.id);
			msg.reply('you successfully removed your joinsound!');
		} else {
			let mention = args[0];
			const file = msg.attachments.array()[0];
			if (mention || file) {
				if (file) {
					mention = file.url;
				}

				let snd = await ffprobe(mention, { path: ffprobeStatic.path }).catch(
					() => {},
				);
				if (!snd) {
					msg.reply(
						`you need to use a compatible link or upload the file with the command! For more info use \`${PREFIXES.get(
							msg.guild.id,
						)}.help sound\``,
					);
					return;
				}
				// eslint-disable-next-line prefer-destructuring
				snd = snd.streams[0];
				if (
					snd.codec_name !== 'mp3'
          && snd.codec_name !== 'pcm_s16le'
          && snd.codec_name !== 'pcm_f32le'
				) {
					msg.reply(
						`you need to use a compatible file! For more info use \`${PREFIXES.get(
							msg.guild.id,
						)}.help sound\``,
					);
					return;
				}
				if (snd.duration > 8) {
					msg.reply(
						"the joinsound you're trying to add is longer than 8 seconds.",
					);
					return;
				}
				await addSound(msg.author.id, mention, msg.guild.id);
				msg.reply('you successfully changed your joinsound!');
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
