import Discord from 'discord.js';
import fs from 'fs';
import blapi from 'blapi';
import config from './token';
import data from './db';
import bamands from './bamands';
import { PREFIXES, setUserId } from './shared_assets';
import { checkCommand } from './commandHandler';


const bot = new Discord.Client();


// post to the APIs every 30 minutes
if (config.blapis) {
  blapi.handle(bot, config.blapis, 30);
  // TODO fix blapi types!
}
process.on('uncaughtException', (err) => {
  const chann = bot.channels.get('414809410448261132');

  console.error(`Uncaught Exception:\n${err.stack ? err.stack : err}`);
  if (chann) {
    (chann as Discord.TextChannel).send(`**Outer Uncaught Exception:**\n\`\`\`${err.stack ? err.stack : err}\`\`\``);
  }
});
process.on('unhandledRejection', (err) => {
  const chann = bot.channels.get('414809410448261132');

  console.error(`Unhandled promise rejection:\n${err}`);
  if (chann) {
    (chann as Discord.TextChannel).send(`**Outer Unhandled promise rejection:**\n\`\`\`${err}\`\`\``);
  }
});


// fires on startup and on reconnect
let justStartedUp = true;
bot.on('ready', () => {
  setUserId(bot.user.id); // give user ID to other code
  const chann = bot.channels.get('382233880469438465');
  if (justStartedUp) {
    if (chann && chann.type === 'text') {
      (chann as Discord.TextChannel).send('Running startup...');
    } else {
      console.error('Tebots Server Channel not found.');
    }
    data.startup(bot);
    justStartedUp = false;
  } else {
    chann.send('Just reconnected to Discord...');
  }
  bot.user.setPresence({
    game: {
      name: `${bot.PREFIX}.help`,
      type: 'watching',
      url: 'https://bots.ondiscord.xyz/bots/384820232583249921',
    },
    status: 'online',
  });
  data.getPrefixesE(bot);
});

bot.on('message', async (msg) => {
  try {
    await checkCommand(msg);
  } catch (err) {
    bamands.catchErrorOnDiscord(bot, `in check command: ${err}`);
  }
});

async function guildPrefixStartup(guild) {
  try {
    await data.addGuild(guild.id);
    bot.PREFIXES[guild.id] = await data.getPrefixE(guild.id);
  } catch (err) {
    bamands.catchErrorOnDiscord(bot, `in guildPrefixStartup: ${err}`);
  }
}

bot.on('guildCreate', (guild) => {
  if (guild.available) {
    guildPrefixStartup(guild);
    guild.owner
      .send(
        `Hi there ${guild.owner.displayName}.\nThanks for adding me to your server! If you have any need for help or want to help develop the bot by reporting bugs and requesting features, just join https://discord.gg/2Evcf4T\n\nTo setup the bot, use \`${bot.PREFIX}:help setup\`.\nYou should:\n\t- setup an admin role, as only you and users with administrative permission are able to use admin commands (\`${bot.PREFIX}:setup admin @role\`)\n\t- add some text channels where users can use the bot (\`${bot.PREFIX}:setup command\`)\n\t- add voice channels in which the bot is allowed to `
          + `join to use joinsounds (\`${bot.PREFIX}:setup join\`)\n\t- add a notification channel where bot updates and information will be posted (\`${bot.PREFIX}:setup notification\`)\n\nTo make sure the bot can use all its functions consider giving it a role with administrative rights, if you have not done so yet in the invitation.\n\nThanks for being part of this project,\nBasti aka. the MagiBot Dev`,
      )
      .catch(() => {});
    const chan = bot.channels.get('408611226998800390');
    if (chan) {
      chan.send(
        `:white_check_mark: joined **${guild.name}** from ${guild.region} (${guild.memberCount} users, ID: ${guild.id})\nOwner is: <@${guild.ownerID}> (ID: ${guild.ownerID})`,
      );
    }
  }
});

bot.on('guildDelete', (guild) => {
  if (guild.available) {
    const chan = bot.channels.get('408611226998800390');
    if (chan) {
      chan.send(
        `:x: left ${guild.name} (${guild.memberCount} users, ID: ${guild.id})`,
      );
    }
  }
});

bot.on('error', (err) => {
  bamands.catchErrorOnDiscord(bot, err);
  console.log(err);
});

bot.on('voiceStateUpdate', async (o, n) => {
  try {
    const newVc = n.voiceChannel;
    // check if voice channel actually changed, don't mute bots
    if (
      !n.user.bot
      && (!o.voiceChannel || o.voiceChannelID != n.voiceChannelID)
    ) {
      // is muted and joined a vc? maybe still muted from queue
      if (
        n.serverMute
        && n.voiceChannel
        && (await data.isStillMuted(n.id, n.guild.id))
      ) {
        n.setMute(
          false,
          'was still muted from a queue which user disconnected from',
        );
        data.toggleStillMuted(n.id, n.guild.id, false);
      }
      if (
        !n.serverMute
        && n.voiceChannel
        && bot.queueVoiceChannels[n.guild.id]
        && bot.queueVoiceChannels[n.guild.id] == n.voiceChannelID
      ) {
        // user joined a muted channel
        n.setMute(true, 'joined active queue voice channel');
      } else if (
        n.serverMute
        && o.voiceChannel
        && bot.queueVoiceChannels[o.guild.id]
        && bot.queueVoiceChannels[o.guild.id] == o.voiceChannelID
      ) {
        // user left a muted channel
        if (n.voiceChannel) {
          n.setMute(false, 'left active queue voice channel');
        } else {
          // save the unmute for later
          data.toggleStillMuted(n.id, n.guild.id, true);
        }
      } else if (
        newVc
        && !n.guild.me.voiceChannel
        && n.id != bot.user.id
        && !(await data.isBlacklistedUser(n.id, n.guild.id))
        && (await data.joinable(n.guild.id, n.voiceChannelID))
      ) {
        if (newVc.permissionsFor(n.guild.me).has('CONNECT')) {
          const sound = await data.getSound(n.id, n.guild.id);
          if (sound) {
            newVc.join().then((connection) => {
              if (connection) {
                // TODO use connection.play when discord.js updates
                const dispatcher = connection.playArbitraryInput(sound, {
                  seek: 0,
                  volume: 0.2,
                  passes: 1,
                  bitrate: 'auto',
                });
                dispatcher.once('end', () => {
                  connection.disconnect();
                  dispatcher.removeAllListeners(); // To be sure noone listens to this anymore
                });
                dispatcher.once('error', () => {
                  connection.disconnect();
                  dispatcher.removeAllListeners(); // To be sure noone listens to this anymore
                });
              }
            });
          }
        }
      }
    }
  } catch (err) {
    bamands.catchErrorOnDiscord(bot, `in voice update: ${err}`);
  }
});

bot.on('disconnected', () => {
  console.log('Disconnected!');
});

loadCommands(); // load all commands
bot.login(bot.TOKEN); // connect to discord
