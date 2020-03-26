import Discord, { Message } from 'discord.js';
import { commandCategories } from './enums';

declare global {
  type magibotCommand = {
    name:string;
    ehelp: (msg:Message)=>Array<{name:string, value:string}>;
    admin: boolean;
    hide:boolean;
    dev:boolean;
    perm: Discord.PermissionResolvable | Discord.PermissionResolvable[];
    category: commandCategories;
    main:
      | ((content:string, msg: Discord.Message) => Promise<any>)
      | ((content:string, msg: Discord.Message) => any);
  };
}
