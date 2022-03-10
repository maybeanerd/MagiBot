import { MessageEmbedOptions } from 'discord.js';
import { COLOR, user, SIGN } from '../../shared_assets';

import { commandCategories } from '../../types/enums';
import { magibotCommand } from '../../types/command';

const inviteURL = 'https://discord.com/api/oauth2/authorize?client_id=384820232583249921&permissions=276131153&redirect_uri=https%3A%2F%2Fdiscord.gg%2F2Evcf4T&scope=bot';

export const inf: magibotCommand = {
	dev: false,
	name: 'info',
	main: ({ message }) => {
		const info: Array<{
      name: string;
      value: string;
      inline: boolean;
    }> = [];

		info.push({
			name: 'Links',
			value: `[Invite me to your guild](${inviteURL})\n[Official support Discord](https://discord.gg/2Evcf4T)`,
			inline: false,
		});

		info.push({
			name: 'How to support MagiBot',
			value:
        'Donate a buck via [Paypal](https://paypal.me/pools/c/8be5ok31vB)\nPledge on [MagiBots Patreon](https://www.patreon.com/MagiBot)\nLeave a review on [bots.ondiscord.xyz](https://bots.ondiscord.xyz/bots/384820232583249921)!',
			inline: false,
		});

		info.push({
			name: 'A bit of background',
			value:
        "MagiBot is being developed in Germany by T0TProduction#0001 as a hobby project.\nIt was originally a private bot for a Discord guild themed after the Pokemon Magikarp which is the reason it's called MagiBot.",
			inline: false,
		});

		const embed: MessageEmbedOptions = {
			color: COLOR,
			description: 'Some information about the bot:',
			fields: info,
			footer: {
				iconURL: user().avatarURL() || '',
				text: SIGN,
			},
		};

		message.channel.send({ embeds: [embed] });
	},
	ehelp() {
		return [
			{
				name: '',
				value:
          'Get some info about the bot as well as links to official MagiBot stuff.',
			},
		];
	},
	perm: ['SEND_MESSAGES', 'EMBED_LINKS'],
	admin: false,
	hide: false,
	category: commandCategories.misc,
};