import Discord from 'discord.js';
import Statcord from 'statcord.js';
import { ping } from './commands/ping';
// eslint-disable-next-line import/no-cycle
import { bot } from './bot';
import { PREFIXES } from './shared_assets';
// eslint-disable-next-line import/no-cycle
import { catchErrorOnDiscord } from './sendToMyDiscord';
import { magibotCommand } from './types/magibot';
import { isBlacklistedUser } from './dbHelpers';

export const commands: { [k: string]: magibotCommand } = {
	ping,
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
If you can reproduce this, consider using \`${
	interaction.guild ? PREFIXES.get(interaction.guild.id) : 'k'
}.bug <bugreport>\` or join the support discord (link via \`${
	interaction.guild ? PREFIXES.get(interaction.guild.id) : 'k'
}.info\`) to tell us exactly how.`);
}

// TODO readd all checks and validations we might need that are existant on normal commands already

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
		// we dont delete the message because this would delete everything that starts with the prefix
		/*     msg.delete(); */
		return;
	}
	try {
		Statcord.ShardingClient.postCommand(
			interaction.commandName,
			interaction.member.user.id,
			bot,
		);
		await commands[interaction.commandName].slashMain!(interaction);
	} catch (err) {
		catchError(err as Error, interaction);
	}
}
