import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import Discord, { Message, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';
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
};

type MagibotSlashCommandBase = {
  permissions: Discord.PermissionResolvable | Discord.PermissionResolvable[];
  run: (
    interaction: Discord.ChatInputCommandInteraction
  ) => Promise<void | null> | void | null; // allow null to allow for "empty" returns
};

// eslint-disable-next-line no-shadow
export const enum DeferReply {
  public = 0x1000,
  ephemeral = 0x2000,
}

export type MagibotSlashCommand = MagibotSlashCommandBase & {
  definition: RESTPostAPIApplicationCommandsJSONBody;
  // if true, interactions are deferred: can't use .reply anymore; need to use .followUp instead
  defer?: DeferReply;
};

export type MagibotAdminSlashCommand = MagibotSlashCommandBase & {
  registerSlashCommand: (
    builder: SlashCommandBuilder
  ) => SlashCommandSubcommandsOnlyBuilder;
};
