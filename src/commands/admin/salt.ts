﻿import { CommandInteraction, Guild, User } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { commandCategories } from '../../types/enums';
import { interactionConfirmation } from '../../helperFunctions';
import { MagibotAdminSlashCommand } from '../../types/command';
import { SaltModel, SaltrankModel } from '../../db';
import { updateSaltKing } from '../../dbHelpers';
import { saltGuild, addSalt } from '../salt';

async function resetSalt(G: Guild) {
	const guildID = G.id;
	await SaltrankModel.deleteMany({ guild: guildID });
	await SaltModel.deleteMany({ guild: guildID });
	await updateSaltKing(G);
}

async function removeOldestSaltOfUser(userid: string, G: Guild) {
	const guildID = G.id;
	const id = await SaltModel.find({
		salter: userid,
		guild: guildID,
	})
		.sort({ date: 1 })
		.limit(1);
	if (id[0]) {
		// eslint-disable-next-line no-underscore-dangle
		await SaltModel.deleteOne({ _id: id[0]._id });
		saltGuild(userid, guildID, -1);
		updateSaltKing(G);
		return true;
	}
	return false;
}

async function clearSaltOfUser(userid: string, G: Guild) {
	const guildID = G.id;
	await SaltModel.deleteMany({
		guild: guildID,
		salter: userid,
	});
	await saltGuild(userid, guildID, 1, true);
	await updateSaltKing(G);
}

function printHelp() {
	const info: Array<{ name: string; value: string }> = [];

	info.push({
		name: 'report @user',
		value: 'Report a user for being salty',
	});

	info.push({
		name: 'remove @user',
		value: 'Remove the oldest salt report of a user',
	});

	info.push({
		name: 'clear @user',
		value: 'Clear all salt of a user',
	});

	info.push({
		name: 'reset',
		value: 'Reset all salt of this guild. Use with caution',
	});

	return info;
}

async function resetSaltOfGuild(interaction: CommandInteraction) {
	const confirmation = await interactionConfirmation(
		interaction,
		'Do you really want to reset all salt on this server?',
		'Successfully canceled salt reset.',
	);
	if (confirmation) {
		const guild = interaction.guild!;
		await resetSalt(guild);
		confirmation.reply(`Successfully reset all salt on **${guild.name}**!`);
	}
}

async function clearAllSaltOfUser(interaction: CommandInteraction, user: User) {
	if (user.bot) {
		interaction.reply('Bots are never salty!');
		return;
	}
	const confirm = await interactionConfirmation(
		interaction,
		`Do you want to clear all salt from ${user}?`,
	);
	if (confirm) {
		await clearSaltOfUser(user.id, interaction.guild!);
		confirm.reply(`Successfully cleared all salt from ${user}!`);
	}
}

async function removeSaltOfUser(interaction: CommandInteraction, user: User) {
	if (user.bot) {
		interaction.reply('Bots are never salty!');
		return;
	}
	const confirm = await interactionConfirmation(
		interaction,
		`Do you want to remove the oldest salt from ${user}?`,
	);
	if (confirm) {
		if (await removeOldestSaltOfUser(user.id, interaction.guild!)) {
			confirm.reply(`Successfully removed the oldest salt from ${user}!`);
		} else {
			confirm.reply(`${user} has no salt that could be removed!`);
		}
	}
}

async function runCommand(interaction: CommandInteraction) {
	const subcommand = interaction.options.getSubcommand(true) as
    | 'report'
    | 'remove'
    | 'clear'
    | 'reset';
	if (subcommand === 'reset') {
		return resetSaltOfGuild(interaction);
	}
	if (subcommand === 'report') {
		const user = interaction.options.getUser('user', true);
		return addSalt(interaction, user, true);
	}
	if (subcommand === 'clear') {
		const user = interaction.options.getUser('user', true);
		return clearAllSaltOfUser(interaction, user);
	}
	if (subcommand === 'remove') {
		const user = interaction.options.getUser('user', true);
		return removeSaltOfUser(interaction, user);
	}
	return null;
}

function registerSlashCommand(builder: SlashCommandBuilder) {
	return builder.addSubcommandGroup((subcommandGroup) => subcommandGroup
		.setName('salt')
		.setDescription('Interact with the salt ranking of this server!')
		.addSubcommand((subcommand) => subcommand
			.setName('reset')
			.setDescription('Reset all salt on this server.'))
		.addSubcommand((subcommand) => subcommand
			.setName('report')
			.setDescription('Report a user being salty.')
			.addUserOption((option) => option
				.setName('user')
				.setDescription('The user you want to report.')
				.setRequired(true)))
		.addSubcommand((subcommand) => subcommand
			.setName('remove')
			.setDescription('Remove oldest salt report of a user.')
			.addUserOption((option) => option
				.setName('user')
				.setDescription('The user you want to remove salt from.')
				.setRequired(true)))
		.addSubcommand((subcommand) => subcommand
			.setName('clear')
			.setDescription('Clear all salt of a specific user.')
			.addUserOption((option) => option
				.setName('user')
				.setDescription('The user you want to remove salt from.')
				.setRequired(true))));
}

export const salt: MagibotAdminSlashCommand = {
	help() {
		return printHelp();
	},
	permissions: 'SEND_MESSAGES',
	category: commandCategories.util,
	run: runCommand,
	registerSlashCommand,
};
