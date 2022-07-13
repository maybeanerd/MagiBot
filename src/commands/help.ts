import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  EmbedFieldData,
  GuildMember,
  MessageEmbedOptions,
} from 'discord.js';
import { user } from '../shared_assets';
import {
  MagibotAdminSlashCommand,
  MagibotSlashCommand,
} from '../types/command';
import { adminApplicationCommands } from './admin/adminApplicationCommands';
import {
  globalApplicationCommandsForAdminsOnly,
  globalApplicationCommandsForEveryone,
} from './applicationCommands';

type MagibotSlashCommandOfAnyType =
  | MagibotSlashCommand
  | MagibotAdminSlashCommand;

type ObjectOfCommands = {
  [key: string]: MagibotSlashCommandOfAnyType;
};
type ObjectOfNestedCommands = {
  [key: string]: MagibotSlashCommandOfAnyType | ObjectOfCommands;
};

function getAllNestedCommandsOfObject(
  commands: ObjectOfCommands,
  parentCommand: string,
): string {
  return Object.keys(commands)
    .reduce((previous, key) => `${previous}/${parentCommand} ${key} `, '')
    .slice(1);
}

function getAllCommandsOfObject(commands: ObjectOfNestedCommands): string {
  return Object.entries(commands).reduce(
    (previous, [key, value]) => `${previous}/${
      Object.hasOwn(value, 'permissions') && Object.hasOwn(value, 'run') // this implies it's a command
        ? key
        : getAllNestedCommandsOfObject(value as ObjectOfCommands, key)
    } `,
    '',
  );
}

const discordIntegrationManagementBlogPost = 'https://support.discord.com/hc/en-us/articles/360045093012-Server-Integrations-Page#:~:text=Membership%20Integration%20FAQ-,BOTS%20AND%20APPS,-And%20now%20for';

function getFields(): Array<EmbedFieldData> {
  return [
    {
      name: 'How to use the bot',
      value: `To get a list of all commands you can use, type \`/\` and select MagiBot on the left sidebar. Pick the one you want to use and send it away!
If you already know the command you want to use, just start typing it's name, Discord will even help you out with autocomplete.`,
      inline: false,
    },
    {
      name: 'List of commands',
      value: getAllCommandsOfObject(globalApplicationCommandsForEveryone),
      inline: false,
    },
    {
      name: 'List of administrator commands',
      value: getAllCommandsOfObject({
        ...globalApplicationCommandsForAdminsOnly,
        admin: adminApplicationCommands,
      }),
      inline: false,
    },
    {
      name: 'Access to administrator commands',
      value: `These commands are only available to users with \`administrator\` or \`manage-guild\` permissions by default.
To allow other users to use these commands as well, go to your guilds settings, and [in the integrations tab](${discordIntegrationManagementBlogPost}) you can manage access to commands. 
Just add the user or role you want to give access!`,
      inline: false,
    },
  ];
}

const slashCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Ask me for help, and I will deliver.')
  .setDMPermission(false);

export const help: MagibotSlashCommand = {
  permissions: [],
  async run(interaction: CommandInteraction) {
    const helpEmbed: MessageEmbedOptions = {
      color: (interaction.member as GuildMember).displayColor,
      description: "I'm here to help! ",
      fields: getFields(),
      footer: {
        iconURL: user().avatarURL() || '',
        text: 'If there are still open questions, feel free to join the support server linked in /info.',
      },
    };
    await interaction.reply({ embeds: [helpEmbed] });
  },
  definition: slashCommand.toJSON(),
};
