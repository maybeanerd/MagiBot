import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { interactionMemberIsAdmin } from '../../dbHelpers';
import {
	MagibotAdminSlashCommand,
	MagibotSlashCommand,
} from '../../types/command';
import { commandCategories } from '../../types/enums';
import { salt } from './salt';
import { joinsound } from './joinsound';

// TODO make this only available to admins!
const adminApplicationCommandBase = new SlashCommandBuilder()
	.setName('admin')
	.setDescription('Admin only commands.');

const adminApplicationCommands: { [k: string]: MagibotAdminSlashCommand } = {
	salt,
	joinsound,
};

Object.values(adminApplicationCommands).forEach((command) => {
	command.registerSlashCommand(adminApplicationCommandBase);
});

async function runCommand(interaction: CommandInteraction) {
	// TODO in the future we could hide admin commands from non-admins as well?
	if (!(await interactionMemberIsAdmin(interaction))) {
		await interaction.reply({
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
	help() {
		// TODO compile from help of all admin commands?
		return [];
	},
	permissions: 'SEND_MESSAGES',
	category: commandCategories.admin,
	run: runCommand,
	definition: adminApplicationCommandBase.toJSON(),
	isSlow: false,
};
