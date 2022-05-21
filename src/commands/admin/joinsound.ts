import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { isShadowBanned, shadowBannedLevel } from '../../shared_assets';
import { commandCategories } from '../../types/enums';
import { interactionConfirmation } from '../../helperFunctions';
import { MagibotAdminSlashCommand } from '../../types/command';
import { removeSound, setDefaultGuildJoinsound, validateAndSaveJoinsound } from '../joinsounds/management';

function printHelp() {
	const info: Array<{ name: string; value: string }> = [];
	info.push({
		name: '<@User|userid|nickname> (and attach soundfile to this command)',
		value:
      'Set up a joinsound for another user. Only .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
	});
	info.push({
		name: 'default (and attach soundfile to this command)',
		value:
      'Set up a default joinsound for users on this server. They can override it by setting their own sound.\nOnly .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
	});
	info.push({
		name: 'rem <@User|userid|nickname>',
		value:
      'Remove the joinsound of a user. If you use nickname it has to be at least three characters long',
	});
	info.push({
		name: 'rem default',
		value: 'Remove the default joinsound of this server.',
	});
	return info;
}

async function runCommand(interaction: CommandInteraction) {
	const guild = interaction.guild!;
	if (
		isShadowBanned(interaction.member!.user.id, guild.id, guild.ownerId)
    !== shadowBannedLevel.not
	) {
		interaction.followUp('You cant do this.');
		return;
	}

	const subcommand = interaction.options.getSubcommand(true) as
    | 'set'
    | 'set-default'
    | 'remove'
    | 'remove-default';

	if (subcommand === 'set') {
		const user = interaction.options.getUser('user', true);
		const attachment = interaction.options.getAttachment('sound', true);
		validateAndSaveJoinsound(attachment, interaction, false, user);
		return;
	}
	if (subcommand === 'set-default') {
		const attachment = interaction.options.getAttachment('sound', true);
		validateAndSaveJoinsound(attachment, interaction, true, undefined, guild.id);
		return;
	}
	if (subcommand === 'remove') {
		const user = interaction.options.getUser('user', true);
		await removeSound(user.id, guild.id);
		interaction.followUp(`You successfully removed ${user}s joinsound!`);
		return;
	}
	if (subcommand === 'remove-default') {
		const confirmed = await interactionConfirmation(
			interaction,
			'Do you want to remove the default joinsound of this server?',
		);
		if (!confirmed) {
			return;
		}
		await setDefaultGuildJoinsound(guild.id, undefined);
		confirmed.followUp(
			'You successfully removed the default joinsound of this server!',
		);
	}
}

function registerSlashCommand(builder: SlashCommandBuilder) {
	return builder.addSubcommandGroup((subcommandGroup) => subcommandGroup
		.setName('joinsound')
		.setDescription('Manage joinsounds on this guild.')
		.addSubcommand((subcommand) => subcommand
			.setName('set')
			.setDescription('Set someones joinsound.')
			.addAttachmentOption((option) => option
				.setName('user')
				.setDescription('The user you want to set the sound for.')
				.setRequired(true))
			.addAttachmentOption((option) => option
				.setName('sound')
				.setDescription(
					'The sound you want to use. Mp3 or wav, max length of 8 seconds.',
				)
				.setRequired(true)))
		.addSubcommand((subcommand) => subcommand
			.setName('remove')
			.setDescription('Remove someones joinsound.')
			.addUserOption((option) => option
				.setName('user')
				.setDescription('Remove the joinsound of a user on this guild.')
				.setRequired(true)))
		.addSubcommand((subcommand) => subcommand
			.setName('set-default')
			.setDescription('Set the default joinsound for this server.')
			.addAttachmentOption((option) => option
				.setName('sound')
				.setDescription(
					'The sound you want to use per default on this guild. Mp3 or wav, max length of 8 seconds.',
				)
				.setRequired(true)))
		.addSubcommand((subcommand) => subcommand
			.setName('remove-default')
			.setDescription('Remove the default joinsound of this guild.')));
}
export const joinsound: MagibotAdminSlashCommand = {
	help() {
		return printHelp();
	},
	permissions: 'SEND_MESSAGES',
	category: commandCategories.util,
	run: runCommand,
	registerSlashCommand,
};
