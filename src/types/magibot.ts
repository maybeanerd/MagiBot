import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9';
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
  main: (necessaryInformation: {
    content: string;
    message: Discord.Message;
  }) => Promise<void> | void;
  slashCommand?: {
    main: (interaction: Discord.CommandInteraction) => Promise<void> | void;
    definition: RESTPostAPIApplicationCommandsJSONBody;
  };
};
