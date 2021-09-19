import { yesOrNo } from '../helperFunctions';
import { PREFIXES } from '../shared_assets';
import { commandCategories } from '../types/enums';
import { magibotCommand } from '../types/magibot';
import { sendBugreport } from '../webhooks';

export const bug: magibotCommand = {
	name: 'bug',
	async main(content, msg) {
		if (!(content.length > 0)) {
			msg.reply(
				`you need to add info about the report after the command. Use \`${PREFIXES.get(
          msg.guild!.id,
				)}.help bug\` to get more info.`,
			);
			return;
		}
		const confirmed = await yesOrNo(
			msg,
			`Do you want to send this bugreport?\n${content}`,
			'Successfully canceled bugreport.',
		);
		if (confirmed) {
			await sendBugreport(
				`**Bugreport** by ${msg.author.username} (<@${
					msg.author.id
				}>) on server ${msg.guild!.name}( ${msg.guild!.id} ) :\n${content}`,
			);
			await msg.channel.send('Succesfully sent bugreport.');
		}
	},
	admin: false,
	ehelp() {
		return [
			{
				name: '<bugreport with information about what you did, what was expected, and what went wrong>',
				value: 'Report a bug concerning MagiBot',
			},
		];
	},
	perm: 'SEND_MESSAGES',
	hide: false,
	dev: false,
	category: commandCategories.misc,
};
