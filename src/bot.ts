import {
  ChatInputCommandInteraction,
  Client,
  DiscordAPIError,
  GatewayIntentBits,
} from 'discord.js';
import { handle } from 'blapi';
import { generateDependencyReport } from '@discordjs/voice';
import { ActivityType } from 'discord-api-types/v10';
import config from './configuration';
import { TOKEN, setUser } from './shared_assets';
// eslint-disable-next-line import/no-cycle
import { catchErrorOnDiscord } from './sendToMyDiscord';
import { getUserMention } from './helperFunctions';
import { startUp } from './cronjobs';
import { sendJoinEvent } from './webhooks';
import { checkApplicationCommand } from './applicationCommandHandler';
import { onVoiceStateChange } from './voiceChannelManager';
import { onInteraction } from './commands/queue/buttonInteractions';
import { checkGuild } from './dbHelpers';
import { initPostHog, shutdownPostHog } from './analytics';

console.log(generateDependencyReport());

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildIntegrations,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.DirectMessageReactions,
];

export const bot = new Client({ intents });
// post to the APIs every 30 minutes
handle(bot, config.blapis, 30);

// Initialize PostHog analytics
initPostHog();

process.on('uncaughtException', async (err) => {
  console.error(`Uncaught Exception:\n${err.stack ? err.stack : err}`);
  await catchErrorOnDiscord(
    `**Uncaught Exception:**\n\`\`\`${err.stack ? err.stack : err}\`\`\``,
  );
});
process.on(
  'unhandledRejection',
  async (err: any /* to fix weird type issues */) => {
    console.error(`Unhandled promise rejection:\n${err}`);
    if (err) {
      if (err instanceof DiscordAPIError) {
        await catchErrorOnDiscord(
          `**DiscordAPIError (${err.method || 'NONE'}):**\n\`\`\`${
            err.message
          }\`\`\`\`\`\`${err.stack ? err.stack.substring(0, 1200) : ''}\`\`\``,
        );
      } else {
        await catchErrorOnDiscord(
          `**Outer Unhandled promise rejection:**\n\`\`\`${err}\`\`\`\`\`\`${
            err.stack ? err.stack.substring(0, 1200) : ''
          }\`\`\``,
        );
      }
    }
  },
);

// fires on startup and on reconnect
let justStartedUp = true;
bot.on('ready', async () => {
  if (!bot.user) {
    throw new Error('FATAL Bot has no user.');
  }
  setUser(bot.user); // give user ID to other code
  if (justStartedUp) {
    startUp(bot);
    justStartedUp = false;
  }
  bot.user.setPresence({
    activities: [
      {
        name: '/help',
        url: 'https://bots.ondiscord.xyz/bots/384820232583249921',
        type: ActivityType.Watching,
      },
    ],
    status: 'online',
  });
});

bot.on('interactionCreate', async (interaction) => {
  // handle button interactions
  if (interaction.isButton()) {
    if (await onInteraction(interaction)) {
      return;
    }
    // more handlers could be added here
  }
  if (interaction.isCommand()) {
    try {
      await checkApplicationCommand(interaction as ChatInputCommandInteraction);
    } catch (err) {
      console.error(err);
    }
  }
  /* if (interaction.isContextMenuCommand()) {
    try {
      // TODO add commands that are offered in the context menu
    } catch (err) {
      console.error(err);
    }
  } */
});

bot.on('guildCreate', async (guild) => {
  await checkGuild(guild.id); // Create guild in database if it doesn't exist yet
  if (guild.available) {
    const owner = await guild.fetchOwner();
    let sentWelcomeMessage;
    // TODO migrate welcome message to channel instead of message to owner?
    try {
      await owner.send(
        `Hi there ${owner.displayName}.
Thanks for adding me to your server! If you have any need for help or want to support the development of the bot by reporting bugs and requesting features, join the support server: https://discord.gg/2Evcf4T

To see a list of commands use \`/help\`.

Now that I joined your server, you could:
\t- Take a look at command permissions in your server settings to adjust who is allowed to use admin commands. By default, only users with "Administrator" or "Manage Server" permissions are allowed to do so.
\t- Check if you want to restrict voice channels in which the bot is allowed to join to use joinsounds. By default, it is allowed in all voice channels. (\`/admin joinsound voicechannel\`)

Thanks for being part of this project!`,
      );
      sentWelcomeMessage = true;
    } catch {
      sentWelcomeMessage = false;
    }

    await sendJoinEvent(
      `:white_check_mark: joined **${guild.name}**: "${
        guild.preferredLocale
      }" (${guild.memberCount} users, ID: ${guild.id})
Owner is: ${getUserMention(guild.ownerId)} (ID: ${
  guild.ownerId
}), got welcome message: ${sentWelcomeMessage}`,
    );
  }
});

bot.on('guildDelete', async (guild) => {
  if (guild.available) {
    await sendJoinEvent(
      `:x: left ${guild.name} (${guild.memberCount} users, ID: ${guild.id})`,
    );
  }
});

bot.on('error', (err) => {
  console.error(err);
});

bot.on('voiceStateUpdate', onVoiceStateChange);

bot.on('disconnect', () => {
  console.log('Disconnected!');
});

process.on('exit', () => {
  shutdownPostHog();
});

bot.login(TOKEN); // connect to discord
