import Discord from 'discord.js';
import Statcord from 'statcord.js';
// eslint-disable-next-line import/no-cycle
import { bot } from './bot';
import { PREFIXES } from './shared_assets';
// eslint-disable-next-line import/no-cycle
import { catchErrorOnDiscord } from './sendToMyDiscord';
import {
  commandAllowed,
  printCommandChannels,
  usageUp,
} from './commandHandler';
import { applicationCommands } from './commands/applicationCommands';
import { DeferReply } from './types/command';

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

export async function checkApplicationCommand(
  interaction: Discord.CommandInteraction,
) {
  if (!(interaction.member && interaction.guild && interaction.guild.me)) {
    // check for valid message
    console.error('Invalid interaction received:', interaction);
    return;
  }
  try {
    Statcord.ShardingClient.postCommand(
      interaction.commandName,
      interaction.member.user.id,
      bot,
    );
    const command = applicationCommands[interaction.commandName];
    if (command) {
      const { permissions } = command;
      if (
        !(await commandAllowed(interaction.guild.id, interaction.channel?.id))
      ) {
        await interaction.reply({
          content: `Commands aren't allowed in <#${
            interaction.channel?.id
          }>. Use them in ${await printCommandChannels(
            interaction.guild.id,
          )}. If you're an admin use \`/help\` to see how you can change that.`,
          ephemeral: true,
        });
        return;
      }
      // check for all needed permissions
      const botPermissions = (
        interaction.channel as Discord.TextChannel
      ).permissionsFor(interaction.guild.me);
      if (!botPermissions.has(permissions)) {
        await interaction.reply(
          `I am missing permissions for this command. I require all of the following:\n${permissions}`,
        );
      }
      if (command.defer) {
        // allow slow commands to have more time to respond
        await interaction.deferReply({ ephemeral: command.defer === DeferReply.ephemeral });
      }
      // actually use the command
      await command.run(interaction);
      await usageUp(interaction.member.user.id, interaction.guild.id);
    }
  } catch (err) {
    catchError(err as Error, interaction);
  }
}
