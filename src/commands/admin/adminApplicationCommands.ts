import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import {
  MagibotAdminSlashCommand,
  MagibotSlashCommand,
} from '../../types/command';
import { salt } from './salt';
import { joinsound } from './joinsound';
import { queue } from './queue';
import { config } from './config';
import { adminDeferralType } from '../../shared_assets';

const adminApplicationCommandBase = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Admin only commands.')
  .setDMPermission(false)
  .setDefaultMemberPermissions(0); // only allow administrators to use these commands by default

const adminApplicationCommands: { [k: string]: MagibotAdminSlashCommand } = {
  // TODO move these away from /admin?
  salt,
  joinsound,
  queue, // especially this since there is no non-admin version of it
  config,
};

Object.values(adminApplicationCommands).forEach((command) => {
  command.registerSlashCommand(adminApplicationCommandBase);
});

async function runCommand(interaction: CommandInteraction) {
  const subcommandGroup = interaction.options.getSubcommandGroup(true);
  const command = adminApplicationCommands[subcommandGroup];
  // we assume the command exists, but just in case
  if (command) {
    command.run(interaction);
  }
}

export const admin: MagibotSlashCommand = {
  permissions: [],
  run: runCommand,
  definition: adminApplicationCommandBase.toJSON(),
  defer: adminDeferralType,
};
