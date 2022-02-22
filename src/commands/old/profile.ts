import { MessageEmbedOptions } from 'discord.js';
import { commandCategories } from '../../types/enums';
import { PREFIXES } from '../../shared_assets';
import { findMember } from '../../helperFunctions';
import { magibotCommand } from '../../types/magibot';
import { SaltrankModel } from '../../db';
import { getGlobalUser, getUser } from '../../dbHelpers';

async function getSalt(userid: string, guildID: string) {
	const result = await SaltrankModel.findOne({
		salter: userid,
		guild: guildID,
	});
	if (!result) {
		return 0;
	}
	return result.salt;
}

export const profile: magibotCommand = {
	name: 'profile',
	dev: false,
	main: async function main({ content, message }) {
		if (message.guild) {
			const args = content.split(/ +/);
			const mention = args[0];
			let { user /* , fuzzy */ } = await findMember(message.guild, mention);
			if (!user && mention) {
				message.reply(
					` you need to define the user uniquely or not mention any user. For more help use \`${PREFIXES.get(
						message.guild.id,
					)}.help profile\``,
				);
				return;
			}
			// profile doesnt do any harm so lets just always call it without asking
			/* if (fuzzy) {
				const confirm = await yesOrNo(message, `Did you mean ${user}?`);
				if (!confirm) {
					return;
				}
			} */
			const userId = user?.id || message.author.id;
			const info: Array<{
        name: string;
        value: string;
        inline: boolean;
      }> = [];
			const salt = await getSalt(userId, message.guild.id);
			const { botusage, sound } = await getUser(userId, message.guild.id);
			let joinsound = sound;
			let isGlobalSound = false;
			if (!joinsound) {
				const globalUser = await getGlobalUser(userId);
				if (globalUser && globalUser.sound) {
					joinsound = globalUser.sound;
					isGlobalSound = true;
				}
			}
			info.push({
				name: 'Saltlevel',
				value: String(salt),
				inline: false,
			});
			info.push({
				name: 'Bot usage',
				value: String(botusage),
				inline: false,
			});
			info.push({
				name: `Joinsound${isGlobalSound ? ' (default)' : ''}`,
				value: joinsound || 'Empty',
				inline: false,
			});
			user = user || (await message.guild.members.fetch(userId)!);
			const embed: MessageEmbedOptions = {
				color: user.displayColor,
				description: `Here's some info on ${user.displayName}`,
				fields: info,
				thumbnail: { url: user.user.avatarURL() || '' },
				footer: {
					iconURL: user.user.avatarURL() || '',
					text: user.user.tag,
				},
			};
			message.channel.send({ embeds: [embed] });
		} else {
			message.reply('This command is only available in guilds.');
		}
	},
	ehelp() {
		return [
			{
				name: '',
				value: 'Get info about yourself.',
			},
			{
				name: '<@user|userid|nickname>',
				value:
          'Get info about a certain user. If you use the nickname you need to at least define three characters.',
			},
		];
	},
	perm: ['SEND_MESSAGES', 'EMBED_LINKS'],
	admin: false,
	hide: false,
	category: commandCategories.util,
};
