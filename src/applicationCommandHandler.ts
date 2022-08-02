import Discord from 'discord.js';
/* import Statcord from 'statcord.js';
// eslint-disable-next-line import/no-cycle
import { bot } from './bot'; */
import { catchErrorOnDiscord } from './sendToMyDiscord';
import { usageUp } from './commandHandler';
import { globalApplicationCommands } from './commands/applicationCommands';
import { DeferReply } from './types/command';
import { doesInteractionRequireFollowup } from './helperFunctions';

async function catchError(
  error: Error,
  interaction: Discord.ChatInputCommandInteraction,
) {
  console.error(
    `Caught:\n${error.stack}\nin command ${interaction.commandName} ${interaction.options}`,
  );
  await catchErrorOnDiscord(
    `**Command:** ${interaction.commandName} ${interaction.options}\n**Caught Error:**\n\`\`\`${error.stack}\`\`\``,
  );

  const messageContent = `Something went wrong while using ${interaction.commandName}. The devs have been automatically notified.
If you can reproduce this, consider using \`/bugreport\` or join the support discord (link via \`/info\`) to tell us exactly how.`;

  if (doesInteractionRequireFollowup(interaction)) {
    await interaction.followUp(messageContent);
  } else {
    await interaction.reply(messageContent);
  }
}

export async function checkApplicationCommand(
  interaction: Discord.ChatInputCommandInteraction,
) {
  if (
    !(interaction.member && interaction.guild && interaction.guild.members.me)
  ) {
    // check for valid message
    console.error('Invalid interaction received:', interaction);
    return;
  }
  try {
    /* Statcord.ShardingClient.postCommand(
      interaction.commandName,
      interaction.member.user.id,
      bot,
    ); */
    const command = globalApplicationCommands[interaction.commandName];
    if (command) {
      const { permissions } = command;
      // check for all needed permissions
      const botPermissions = (
        interaction.channel as Discord.TextChannel
      ).permissionsFor(interaction.guild.members.me);
      if (!botPermissions.has(permissions)) {
        await interaction.reply(
          `I am missing permissions for this command. I require all of the following:\n${permissions}`,
        );
        return;
      }
      if (command.defer) {
        // allow slow commands to have more time to respond
        await interaction.deferReply({
          ephemeral: command.defer === DeferReply.ephemeral,
        });
      }
      // actually use the command
      await command.run(interaction);
      await usageUp(interaction.member.user.id, interaction.guild.id);
    }
  } catch (err) {
    catchError(err as Error, interaction);
  }
}
