import Discord, { Message } from 'discord.js';
import { commandCategories } from './enums';

export type magibotCommand = {
	name: string;
	ehelp: (msg: Message) => Array<{ name: string; value: string }>;
	admin: boolean;
	hide: boolean;
	dev: boolean;
	perm: Discord.PermissionResolvable | Discord.PermissionResolvable[];
	category: commandCategories;
	main:
		| ((content: string, msg: Discord.Message) => Promise<void>)
		| ((content: string, msg: Discord.Message) => void);
};
