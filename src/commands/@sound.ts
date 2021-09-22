import { PREFIXES, isShadowBanned, shadowBannedLevel } from '../shared_assets';
import { commandCategories } from '../types/enums';
import { findMember, yesOrNo } from '../helperFunctions';
import { magibotCommand } from '../types/magibot';
import { addSound, validateJoinsound } from './sound';

function printHelp() {
	const info: Array<{ name: string; value: string }> = [];

	info.push({
		name: 'rem <@User|userid|nickname>',
		value:
      'Remove the joinsound of a user. If you use nickname it has to be at least three characters long',
	});
	info.push({
		name: '<@User|userid|nickname> (and attach soundfile to this command)',
		value:
      'Set up a joinsound for another user. Only .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
	});
	return info;
}

export const sound: magibotCommand = {
	name: 'sound',
	dev: false,
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
		const mention = args[1];
		if (command === 'rem') {
			/* eslint-disable no-case-declarations */
			const { user, fuzzy } = await findMember(msg.guild, mention);
			/* eslint-enable no-case-declarations */
			if (mention && user) {
				if (fuzzy) {
					const confirm = await yesOrNo(
						msg,
						`Do you want to remove ${user}s joinsound?`,
					);
					if (!confirm) {
						return;
					}
				}
				await addSound(user.id, undefined, msg.guild.id);
				msg.reply(`you successfully removed ${user}s joinsound!`);
			} else {
				msg.reply('you need to mention a user you want to use this on!');
			}
		} else {
			const userSearch = args[0];
			const file = msg.attachments.first();
			const { user, fuzzy } = await findMember(msg.guild, userSearch);
			if (fuzzy) {
				const confirm = await yesOrNo(
					msg,
					`Do you want to set the joinsound for ${user}?`,
				);
				if (!confirm) {
					return;
				}
			}
			if (file && user) {
				await validateJoinsound(file.url, msg, false, user);
			} else {
				msg.reply(
					`This is not a valid command. If you tried adding a sound for another user, remember to attach the file to the command and specify the user. Use \`${PREFIXES.get(
						msg.guild.id,
					)}:help sound\` for more info.`,
				);
			}
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
