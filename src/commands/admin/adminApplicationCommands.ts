import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { interactionMemberIsAdmin } from '../../dbHelpers';
import {
  DeferReply,
  MagibotAdminSlashCommand,
  MagibotSlashCommand,
} from '../../types/command';
import { salt } from './salt';
import { joinsound } from './joinsound';
import { queue } from './queue';
import { config } from './config';

// TODO make this only available to admins? might be possible to adjust visibility of commands
const adminApplicationCommandBase = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Admin only commands.');

const adminApplicationCommands: { [k: string]: MagibotAdminSlashCommand } = {
  salt,
  joinsound,
  queue,
  config,
};

Object.values(adminApplicationCommands).forEach((command) => {
  command.registerSlashCommand(adminApplicationCommandBase);
});

async function runCommand(interaction: CommandInteraction) {
  // TODO in the future we could hide admin commands from non-admins as well?
  if (!(await interactionMemberIsAdmin(interaction))) {
    await interaction.followUp({
      content: "You're not allowed to use this command.",
      ephemeral: true,
    });
    return;
  }

  const subcommandGroup = interaction.options.getSubcommandGroup(true);
  const command = adminApplicationCommands[subcommandGroup];
  if (command) {
    // we assume the command exists, but just in case
    command.run(interaction);
  }
}
export const admin: MagibotSlashCommand = {
  permissions: [],
  run: runCommand,
  definition: adminApplicationCommandBase.toJSON(),
  defer: DeferReply.public,
};
