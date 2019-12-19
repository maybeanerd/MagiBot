import Discord from 'discord.js';
import { commandCategories } from './enums';

declare global {
  type magibotCommand = {
    args: string;
    help: string;
    admin: boolean;
    hide:boolean;
    dev:boolean;
    perm: Discord.PermissionResolvable | Discord.PermissionResolvable[];
    category: commandCategories;
    main:
      | ((bot: Discord.Client, msg: Discord.Message) => Promise<any>)
      | ((bot: Discord.Client, msg: Discord.Message) => any);
  };
}
