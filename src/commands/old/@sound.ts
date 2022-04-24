import { PREFIXES, isShadowBanned, shadowBannedLevel } from '../../shared_assets';
import { commandCategories } from '../../types/enums';
import { findMember, yesOrNo } from '../../helperFunctions';
import { magibotCommand } from '../../types/command';
import { addSound, setDefaultGuildJoinsound, validateJoinsound } from '../sound';

function printHelp() {
	const info: Array<{ name: string; value: string }> = [];
	info.push({
		name: '<@User|userid|nickname> (and attach soundfile to this command)',
		value:
      'Set up a joinsound for another user. Only .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
	});
	info.push({
		name: 'default (and attach soundfile to this command)',
		value:
      'Set up a default joinsound for users on this server. They can override it by setting their own sound.\nOnly .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
	});
	info.push({
		name: 'rem <@User|userid|nickname>',
		value:
      'Remove the joinsound of a user. If you use nickname it has to be at least three characters long',
	});
	info.push({
		name: 'rem default',
		value: 'Remove the default joinsound of this server.',
	});
	return info;
}

export const sound: magibotCommand = {
	name: 'sound',
	dev: false,
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
		const mention = args[1];
		if (command === 'rem') {
			if (args[1] && args[1].toLowerCase() === 'default') {
				const confirm = await yesOrNo(
					message,
					'Do you want to remove the default joinsound of this server?',
				);
				if (!confirm) {
					return;
				}
				await setDefaultGuildJoinsound(message.guild.id, undefined);
				message.reply(
					'You successfully removed the default joinsound of this server!',
				);
			} else {
				/* eslint-disable no-case-declarations */
				const { user, fuzzy } = await findMember(message.guild, mention);
				/* eslint-enable no-case-declarations */
				if (mention && user) {
					if (fuzzy) {
						const confirm = await yesOrNo(
							message,
							`Do you want to remove ${user}s joinsound?`,
						);
						if (!confirm) {
							return;
						}
					}
					await addSound(user.id, undefined, message.guild.id);
					message.reply(`You successfully removed ${user}s joinsound!`);
				} else {
					message.reply('You need to mention a user you want to use this on!');
				}
			}
		} else if (args[0] && args[0].toLowerCase() === 'default') {
			const confirm = await yesOrNo(
				message,
				'Do you want to set a default joinsound for everyone on this server?',
			);
			if (!confirm) {
				return;
			}
			const file = message.attachments.first();
			const fileUrl = file ? file.url : args[1];
			if (fileUrl) {
				await validateJoinsound(fileUrl, message, true, undefined, message.guild.id);
			} else {
				message.reply(
					`No soundfile found. Remember to attach the file to the command. Use \`${PREFIXES.get(
						message.guild.id,
					)}:help sound\` for more info.`,
				);
			}
		} else {
			const userSearch = args[0];
			const file = message.attachments.first();
			const fileUrl = file ? file.url : args[1];
			const { user, fuzzy } = await findMember(message.guild, userSearch);
			if (fuzzy) {
				const confirm = await yesOrNo(
					message,
					`Do you want to set the joinsound for ${user}?`,
				);
				if (!confirm) {
					return;
				}
			}
			if (fileUrl && user) {
				await validateJoinsound(fileUrl, message, false, user);
			} else {
				message.reply(
					`This is not a valid command. If you tried adding a sound for another user, remember to attach the file to the command and specify the user. Use \`${PREFIXES.get(
						message.guild.id,
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
