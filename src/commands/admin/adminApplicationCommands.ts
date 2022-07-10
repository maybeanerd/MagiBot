import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { interactionMemberIsAdmin } from '../../dbHelpers';
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
  salt,
  joinsound,
  queue,
  config,
};

Object.values(adminApplicationCommands).forEach((command) => {
  command.registerSlashCommand(adminApplicationCommandBase);
});

async function runCommand(interaction: CommandInteraction) {
  if (!(await interactionMemberIsAdmin(interaction))) {
    await interaction.followUp({
      content: "You're not allowed to use this command.",
      ephemeral: true,
    });
    return;
  }

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
