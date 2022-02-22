import Discord from 'discord.js';
import Statcord from 'statcord.js';
import { ping } from './commands/ping';
import { roll } from './commands/roll';
import { invite } from './commands/invite';
import { bugreport } from './commands/bug';
// eslint-disable-next-line import/no-cycle
import { bot } from './bot';
import { PREFIXES } from './shared_assets';
// eslint-disable-next-line import/no-cycle
import { catchErrorOnDiscord } from './sendToMyDiscord';
import { magibotCommand } from './types/magibot';
import { isBlacklistedUser } from './dbHelpers';
import {
	commandAllowed,
	printCommandChannels,
	usageUp,
} from './commandHandler';

export const commands: { [k: string]: magibotCommand } = {
	ping,
	roll,
	invite,
	bugreport,
};

async function catchError(
	error: Error,
	interaction: Discord.CommandInteraction,
) {
	console.error(
		`Caught:\n${error.stack}\nin command ${interaction.commandName} ${interaction.options}`,
	);
	await catchErrorOnDiscord(
		`**Command:** ${interaction.commandName} ${interaction.options}\n**Caught Error:**\n\`\`\`${error.stack}\`\`\``,
	);

	interaction.reply(`Something went wrong while using ${
		interaction.commandName
	}. The devs have been automatically notified.
If you can reproduce this, consider using \`/bugreport\` or join the support discord (link via \`${
	interaction.guild ? PREFIXES.get(interaction.guild.id) : 'k'
}.info\`) to tell us exactly how.`);
}

export async function checkSlashCommand(
	interaction: Discord.CommandInteraction,
) {
	if (!(interaction.member && interaction.guild && interaction.guild.me)) {
		// check for valid message
		console.error('Invalid interaction received:', interaction);
		return;
	}
	// ignore blacklisted users
	if (
		await isBlacklistedUser(interaction.member.user.id, interaction.guild.id)
	) {
		// do nothing
		return;
	}
	try {
		Statcord.ShardingClient.postCommand(
			interaction.commandName,
			interaction.member.user.id,
			bot,
		);
		const command = commands[interaction.commandName];
		if (command && command.slashCommand) {
			const { slashCommand, perm } = command;
			if (
				!(await commandAllowed(interaction.guild.id, interaction.channel?.id))
			) {
				await interaction.reply({
					data: {
						content: `commands aren't allowed in <#${
							interaction.channel?.id
						}>. Use them in ${await printCommandChannels(
							interaction.guild.id,
						)}. If you're an admin use \`/help\` to see how you can change that.`,
					},
					ephemeral: true,
				});
				return;
			}
			// check for all needed permissions
			const botPermissions = (
        interaction.channel as Discord.TextChannel
			).permissionsFor(interaction.guild.me);
			if (!botPermissions.has(perm)) {
				await interaction.reply(
					`I am missing permissions for this command. I require all of the following:\n${perm}`,
				);
			}
			// actually use the command
			await slashCommand.main(interaction);
			await usageUp(interaction.member.user.id, interaction.guild.id);
		}
	} catch (err) {
		catchError(err as Error, interaction);
	}
}
