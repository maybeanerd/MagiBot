import Discord, {
  ActivityType,
  Client,
  DiscordAPIError,
  GatewayIntentBits,
  Guild,
} from 'discord.js';
import { handle } from 'blapi';
import { generateDependencyReport } from '@discordjs/voice';
import config from './configuration';
import {
  PREFIX,
  PREFIXES,
  TOKEN,
  setUser,
  resetPrefixes,
} from './shared_assets';
// eslint-disable-next-line import/no-cycle
import { checkCommand } from './commandHandler';
// eslint-disable-next-line import/no-cycle
import { catchErrorOnDiscord } from './sendToMyDiscord';
import { checkGuild, getPrefix } from './dbHelpers';
import { asyncForEach, getUserMention } from './helperFunctions';
import { startUp } from './cronjobs';
import { sendJoinEvent } from './webhooks';
import { checkApplicationCommand } from './applicationCommandHandler';
import { onVoiceStateChange } from './voiceChannelManager';
import { onInteraction } from './commands/queue/buttonInteractions';

console.log(generateDependencyReport());

async function initializePrefixes(bot: Client) {
  resetPrefixes();
  const guilds = bot.guilds.cache;
  asyncForEach(guilds, async (G) => {
    PREFIXES.set(G.id, await getPrefix(G.id));
  });
}

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildIntegrations, // TODO do we need this? what is this?
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
];

export const bot = new Client({ intents });
// post to the APIs every 30 minutes
if (config.blapis) {
  handle(bot, config.blapis, 30);
}
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
        type: ActivityType.Watching,
        url: 'https://bots.ondiscord.xyz/bots/384820232583249921',
      },
    ],
    status: 'online',
  });
  initializePrefixes(bot);
});

bot.on('message', async (message: Discord.Message) => {
  try {
    await checkCommand(message);
  } catch (err) {
    console.error(err);
  }
});

bot.on('interactionCreate', async (interaction) => {
  // handle button interactions
  if (interaction.isButton()) {
    if (await onInteraction(interaction)) {
      return;
    }
    // more handlers could be added here
  }
  if (interaction.isChatInputCommand()) {
    try {
      await checkApplicationCommand(interaction);
    } catch (err) {
      console.error(err);
    }
  }
  if (interaction.isContextMenuCommand()) {
    try {
      // TODO add commands that are offered in the context menu
    } catch (err) {
      console.error(err);
    }
  }
});

async function guildPrefixStartup(guild: Guild) {
  try {
    await checkGuild(guild.id);
    PREFIXES.set(guild.id, await getPrefix(guild.id));
  } catch (err) {
    console.error(err);
  }
}

bot.on('guildCreate', async (guild) => {
  if (guild.available) {
    await guildPrefixStartup(guild);
    const owner = await guild.fetchOwner();
    if (owner) {
      owner
        .send(
          `Hi there ${owner.displayName}.\nThanks for adding me to your server! If you have any need for help or want to help develop the bot by reporting bugs and requesting features, just join https://discord.gg/2Evcf4T\n\nTo setup the bot, use \`${PREFIX}:help setup\`.\nYou should:\n\t- setup an admin role, as only you and users with administrative permission are able to use admin commands (\`${PREFIX}:setup admin @role\`)\n\t- add some text channels where users can use the bot (\`${PREFIX}:setup command\`)\n\t- add voice channels in which the bot is allowed to `
            + `join to use joinsounds (\`${PREFIX}:setup join\`)\n\t- add a notification channel where bot updates and information will be posted (\`${PREFIX}:setup notification\`)\n\nTo make sure the bot can use all its functions consider giving it a role with administrative rights, if you have not done so yet in the invitation.\n\nThanks for being part of this project,\nBasti aka. the MagiBot Dev`,
        )
        .catch(() => {});
    }
    await sendJoinEvent(
      `:white_check_mark: joined **${guild.name}**: "${
        guild.preferredLocale
      }" (${guild.memberCount} users, ID: ${
        guild.id
      })\nOwner is: ${getUserMention(guild.ownerId)} (ID: ${guild.ownerId})`,
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

bot.login(TOKEN); // connect to discord
