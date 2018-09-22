/* eslint-disable strict*/
'use strict';
/* eslint-enable strict*/

const Discord = require('discord.js');
const fs = require('fs');
const token = require(`${__dirname}/token.js`);
const data = require(`${__dirname}/db.js`);
const blapi = require('blapi');
const bamands = require(`${__dirname}/bamands.js`);

const bot = new Discord.Client({ autoReconnect: true });

const userCooldowns = new Set();

// post to the APIs every 30 minutes
if (token.blapis) {
  blapi.handle(bot, token.blapis);
}
/* eslint-disable prefer-arrow-callback */
process.on('uncaughtException', function catcher(err) {
  const chann = bot.channels.get('414809410448261132');
  if (err.stack) {
    err = err.stack;
  }
  chann.send(`**old catch: Uncaught Exception:**\n\`\`\`${err}\`\`\``);
  console.error(`Uncaught Exception:\n${err}`);
});
process.on('unhandledRejection', function catcher(err) {
  const chann = bot.channels.get('414809410448261132');
  if (err.stack) {
    err = err.stack;
  }
  chann.send(`old catch: **Unhandled promise rejection:**\n\`\`\`${err}\`\`\``);
  console.error(`Unhandled promise rejection:\n${err}`);
});
/* eslint-enable prefer-arrow-callback */

bot.OWNERID = token.owner;
bot.PREFIX = token.prefix;
bot.TOKEN = token.tk;

bot.DETAILED_LOGGING = false;
bot.DELETE_COMMANDS = false;

bot.COLOR = 0x351C75;
bot.SUCCESS_COLOR = 0x00ff00;
bot.ERROR_COLOR = 0x0000ff;
bot.INFO_COLOR = 0x0000ff;

// global variables saved in bot

bot.SIGN = 'MagiBot - created by T0TProduction#0001';
bot.PREFIXES = {};
bot.queueVoiceChannels = {};

/* eslint-disable no-extend-native */
String.prototype.padRight = function padRight(l, c) {
  return this + Array(l - this.length + 1).join(c || ' ');
};
/* eslint-enable no-extend-native */

bot.sendNotification = function sendNotification(info, type, msg) {
  let icolor;

  if (type == 'success') icolor = bot.SUCCESS_COLOR;
  else if (type == 'error') icolor = bot.ERROR_COLOR;
  else if (type == 'info') icolor = bot.INFO_COLOR;
  else icolor = bot.COLOR;

  const embed = {
    color: icolor,
    description: info
  };
  msg.channel.send('', { embed });
};

const commands = {};
// TODO actually use
const commandCategories = ['Utility', 'Fun', 'Miscellaneous'];

commands.help = {};
commands.help.args = '';
commands.help.help = 'Shows all available commands';
commands.help.admin = false;
commands.help.perm = 'SEND_MESSAGES';
commands.help.main = async function main(bo, msg) {
  const args = msg.content.split(/ +/);
  let command = args[0].toLowerCase();
  // extended help
  if (command) {
    const acommand = `@${command}`;
    if (!(commands[command] || commands[acommand])) {
      msg.reply(`this command does not exist. Use \`${bot.PREFIXES[msg.guild.id]}.help\` to get a full list of the commands available.`);
    } else if (commands[command]) {
      if (commands[command].ehelp) {
        let info = [];
        let ehelps = commands[command].ehelp(msg, bot);
        for (const i in ehelps) {
          info.push({
            name: `${bot.PREFIXES[msg.guild.id]}.${command} ${ehelps[i].name}`,
            value: ehelps[i].value,
            inline: false
          });
        }
        let embed = {
          color: bot.COLOR,
          description: `Commands available via the prefix \`${bot.PREFIXES[msg.guild.id]}.${command}\`:`,
          fields: info,
          footer: {
            /* eslint-disable camelcase */
            icon_url: bot.user.avatarURL,
            /* eslint-enable camelcase */
            text: '<required input> , [optional input] , choose|one|of|these , (comment on the command)'
          }
        };

        msg.channel.send('', { embed });
        // admin variant?
        if (msg.member && await data.isAdmin(msg.guild.id, msg.member, bot)) {
          if (commands[acommand] && commands[acommand].ehelp) {
            info = [];
            ehelps = commands[acommand].ehelp(msg, bot);
            for (const i in ehelps) {
              info.push({
                name: `${bot.PREFIXES[msg.guild.id]}:${acommand.slice(1)} ${ehelps[i].name}`,
                value: ehelps[i].value,
                inline: false
              });
            }

            embed = {
              color: bot.COLOR,
              description: `Admin commands available via the prefix \`${bot.PREFIXES[msg.guild.id]}:${command}\`:`,
              fields: info,
              footer: {
                /* eslint-disable camelcase */
                icon_url: bot.user.avatarURL,
                /* eslint-enable camelcase */
                text: '<required input> , [optional input] , choose|one|of|these , (comment on the command)'
              }
            };

            msg.channel.send('', { embed });
          }
        }
      } else {
        msg.reply('there is no extended help available for this command.');
      }
    } else if (msg.member && await data.isAdmin(msg.guild.id, msg.member, bot)) {
      // Only Admin command
      command = acommand;
      if (commands[command].ehelp) {
        const info = [];
        const ehelps = commands[command].ehelp(msg, bot);
        for (const i in ehelps) {
          info.push({
            name: `${bot.PREFIXES[msg.guild.id]}:${command.slice(1)} ${ehelps[i].name}`,
            value: ehelps[i].value,
            inline: false
          });
        }
        const embed = {
          color: bot.COLOR,
          description: `Admin commands available via the prefix \`${bot.PREFIXES[msg.guild.id]}:${command.slice(1)}\`:`,
          fields: info,
          footer: {
            /* eslint-disable camelcase */
            icon_url: bot.user.avatarURL,
            /* eslint-enable camelcase */
            text: '<required input> , [optional input] , choose|one|of|these , (comment on the command)'
          }
        };

        msg.channel.send('', { embed });
      } else {
        msg.reply('there is no extended help available for this command.');
      }
    }
  } else {
    // normal help, sort by categories
    let cmds = [];
    for (const i in commandCategories) {
      const cat = commandCategories[i];
      let coms = '';
      for (const commnd in commands) {
        if (commands[commnd].category == cat && !(commands[commnd].hide || commands[commnd].admin)) {
          let nm = commnd;
          if (commands[commnd].dev) {
            nm += '(dev only)';
          }
          coms += `${nm}, `;
        }
      }
      if (coms != '') {
        coms = coms.slice(0, -2);
        cmds.push({
          name: `${cat} commands`,
          value: coms,
          inline: false
        });
      }
    }
    let embed = {
      color: bot.COLOR,
      description: `Commands available via the prefix \`${bot.PREFIXES[msg.guild.id]}.\` :\nto get more info on a single command use \`${bot.PREFIXES[msg.guild.id]}.help <command>\``,
      fields: cmds,
      footer: {
        /* eslint-disable camelcase */
        icon_url: bot.user.avatarURL,
        /* eslint-enable camelcase */
        text: `admins can override commands with ${bot.PREFIXES[msg.guild.id]}: instead of ${bot.PREFIXES[msg.guild.id]}. to ignore command channel restrictions`
      }
    };
    msg.channel.send('', { embed });
    if (msg.member && await data.isAdmin(msg.guild.id, msg.member, bot)) {
      cmds = [];
      let coms = '';
      for (const commnd in commands) {
        if (commands[commnd].admin && !commands[commnd].hide) {
          let nm = commnd.substr(1, commnd.length);
          if (commands[commnd].dev) {
            nm += '(dev only)';
          }
          coms += `${nm}, `;
        }
      }
      if (coms != '') {
        coms = coms.slice(0, -2);
        cmds.push({
          name: 'Admin commands',
          value: coms,
          inline: false
        });
      }
      embed = {
        color: bot.COLOR,
        description: `Admin commands available via the prefix \`${bot.PREFIXES[msg.guild.id]}:\` :\nto get more info on a single command use \`${bot.PREFIXES[msg.guild.id]}.help <command>\``,
        fields: cmds,
        footer: {
          /* eslint-disable camelcase */
          icon_url: bot.user.avatarURL,
          /* eslint-enable camelcase */
          text: `admins can override commands with ${bot.PREFIXES[msg.guild.id]}: instead of ${bot.PREFIXES[msg.guild.id]}. to ignore command channel restrictions`
        }
      };
      msg.channel.send('', { embed });
    }
  }
};

commands.load = {};
commands.load.args = '<command>';
commands.load.help = '';
commands.load.hide = true;
commands.load.admin = false;
commands.load.dev = true;
commands.load.main = function main(bo, msg) {
  if (msg.author.id == bot.OWNERID) {
    try {
      delete commands[msg.content];
      delete require.cache[`${__dirname}/commands/${msg.content}.js`];
      commands[msg.content] = require(`${__dirname}/commands/${msg.content}.js`);
      bot.sendNotification(`Loaded ${msg.content}.js succesfully.`, 'success', msg);
    } catch (err) {
      bot.sendNotification('The command was not found, or there was an error loading it.', 'error', msg);
    }
  } else {
    bot.sendNotification("You're not allowed to use this..", 'error', msg);
  }
};

commands.unload = {};
commands.unload.args = '<command>';
commands.unload.help = '';
commands.unload.hide = true;
commands.unload.dev = true;
commands.unload.admin = false;
commands.unload.main = function main(bo, msg) {
  if (msg.author.id == bot.OWNERID) {
    try {
      delete commands[msg.content];
      delete require.cache[`${__dirname}/commands/${msg.content}.js`];
      bot.sendNotification(`Unloaded ${msg.content}.js succesfully.`, 'success', msg);
    } catch (err) {
      bot.sendNotification('Command not found.', 'error', msg);
    }
  } else {
    bot.sendNotification("You're not allowed to use this..", 'error', msg);
  }
};

commands.reload = {};
commands.reload.args = '';
commands.reload.help = '';
commands.reload.hide = true;
commands.reload.dev = true;
commands.reload.admin = false;
commands.reload.main = function main(bo, msg) {
  if (msg.author.id == bot.OWNERID) {
    try {
      delete commands[msg.content];
      delete require.cache[`${__dirname}/commands/${msg.content}.js`];
      // commands[args] = require(`${__dirname}/commands/${msg.content}.js`); this line seems wrong but is never used anyways
      bot.sendNotification(`Reloaded ${msg.content}.js successfully.`, 'success', msg);
    } catch (err) {
      msg.channel.send('Command not found');
    }
  } else {
    bot.sendNotification("You're not allowed to use this..", 'error', msg);
  }
};

const loadCommands = function() {
  const files = fs.readdirSync(`${__dirname}/commands`);
  for (const file of files) {
    if (file.endsWith('.js')) {
      commands[file.slice(0, -3)] = require(`${__dirname}/commands/${file}`);
      if (bot.DETAILED_LOGGING) {
        console.log(`Loaded ${file}`);
      }
    }
  }
  console.log('———— All Commands Loaded! ————');
};

const checkCommand = async function(msg, isMention) {
  // ignore blacklisted users
  if (await data.isBlacklistedUser(await msg.author.id, await msg.guild.id)) {
    msg.delete();
    return;
  }
  let command;
  if (isMention) {
    command = msg.content.split(' ')[1];
    msg.content = msg.content.split(' ').splice(2, msg.content.split(' ').length).join(' ');
    command = `.${command}`;
  } else {
    command = msg.content.substring(bot.PREFIXES[msg.guild.id].length, msg.content.length).split(' ')[0].toLowerCase();
    msg.content = msg.content.slice(command.length + bot.PREFIXES[msg.guild.id].length); // delete prefix and command
    msg.content = msg.content.replace(/^\s+/g, ''); // delete leading spaces
  }
  if (command) {
    const pre = command.charAt(0);
    switch (pre) {
    case '.':
      command = command.slice(1);
      break;
    case ':':
      command = `@${command.slice(1)}`;
      // Check if its an admin command, if not you're allowed to use the normal version as admin (in any channel)
      if (!commands[command]) {
        command = command.slice(1);
      }
      // Check if the command exists, to not just spam k: messages
      if (commands[command]) {
        if (!(msg.member && await data.isAdmin(msg.guild.id, msg.member, bot))) {
          if (await msg.channel.permissionsFor(msg.guild.me).has('MANAGE_MESSAGES')) {
            msg.delete();
          }
          if (await msg.channel.permissionsFor(msg.guild.me).has('SEND_MESSAGES')) {
            msg.reply("you're not allowed to use this command.").then(mess => mess.delete(5000));
          }
          return;
        }
      } else {
        return;
      }
      break;
    default:
      return;
    }
    if (commands[command] && (!commands[command].dev || msg.author.id == bot.OWNERID)) {
      if (pre == ':' || await data.commandAllowed(msg.guild.id, msg.channel.id)) {
        const perms = commands[command].perm;
        if (!perms || await msg.channel.permissionsFor(msg.guild.me).has(perms)) {
          // cooldown for command usage
          if (!userCooldowns.has(msg.author.id)) {
            userCooldowns.add(msg.author.id);
            setTimeout(() => {
              userCooldowns.delete(msg.author.id);
            }, 4000);
            try {
              await commands[command].main(bot, msg);
            } catch (err) {
              bamands.catchError(err, bot, msg, `${bot.PREFIXES[msg.guild.id]}${pre}${command.slice(1)}`);
            }
            data.usageUp(msg.author.id, msg.guild.id);
          } else if (await msg.channel.permissionsFor(msg.guild.me).has('SEND_MESSAGES')) {
            msg.reply("whoa cool down, you're using commands too quick!");
          }
          // endof cooldown management
        } else if (await msg.channel.permissionsFor(msg.guild.me).has('SEND_MESSAGES')) {
          msg.channel.send(`I don't have the permissions needed for this command. (${perms}) `);
        }
      } else if (await msg.channel.permissionsFor(msg.guild.me).has('SEND_MESSAGES')) {
        if (await msg.channel.permissionsFor(msg.guild.me).has('MANAGE_MESSAGES')) {
          msg.delete();
        }
        msg.reply(`commands aren't allowed in <#${msg.channel.id}>. Use them in ${await data.commandChannel(msg.guild.id)}. If you're an admin use \`${bot.PREFIX}:help\` to see how you can change that.`).then(mess => mess.delete(15000));
      }
    }
  }
};

bot.on('ready', () => {
  console.log(`Ready to begin! Serving in ${bot.guilds.array().length} servers.`);
  bot.user.setActivity(`${bot.PREFIX}.help`, { type: 'WATCHING' });
  data.startup(bot);
  if (bot.DETAILED_LOGGING) {
    console.log(`By name: ${bot.guilds.array()}`);
  }
  bot.user.setStatus('online', '');
  loadCommands();
  data.getPrefixesE(bot);
  const chann = bot.channels.get('382233880469438465');
  chann.send('Running startup...');
});


bot.on('message', msg => {
  if (!msg.author.bot && msg.guild) {
    if (msg.content.startsWith(`<@${bot.user.id}>`) || msg.content.startsWith(`<@!${bot.user.id}>`)) {
      checkCommand(msg, true);
      if (bot.DELETE_COMMANDS) msg.delete();
    } else if (msg.content.startsWith(bot.PREFIXES[msg.guild.id])) {
      checkCommand(msg, false);
      if (bot.DELETE_COMMANDS) msg.delete();
    }
  }
});

async function guildPrefixStartup(guild) {
  await data.addGuild(guild.id);
  bot.PREFIXES[guild.id] = await data.getPrefixE(guild.id);
}

bot.on('guildCreate', guild => {
  if (guild.available) {
    guildPrefixStartup(guild);
    guild.owner.send(`Hi there ${guild.owner.displayName}.\nThanks for adding me to your server! If you have any need for help or want to help develop the bot by reporting bugs and requesting features, just join https://discord.gg/2Evcf4T\n\nTo setup the bot, use \`${
      bot.PREFIX}:help setup\`.\nYou should:\n\t- setup an admin role, as only you and users with administrative permission are able to use admin commands\n\t- add some text channels where users can use the bot\n\t- add voice channels in which the bot is allowed to ` +
      'join to use joinsounds\n\t- add a notification channel where bot updates and information will be posted\n\nTo make sure the bot can do everything he needs to give him a role with administrative rights, if you have not done so yet in the invitation.\n\nThanks for being part of this project,\nBasti aka. the MagiBot Dev').catch(() => { });
    const chan = bot.channels.get('408611226998800390');
    if (chan) {
      chan.send(`:white_check_mark: joined **${guild.name}** from ${guild.region} (${guild.memberCount} users, ID: ${guild.id})\nOwner is: <@${guild.ownerID}> (ID: ${guild.ownerID})`);
    }
  }
});

bot.on('guildDelete', guild => {
  if (guild.available) {
    const chan = bot.channels.get('408611226998800390');
    if (chan) {
      chan.send(`:x: left ${guild.name} (${guild.memberCount} users, ID: ${guild.id})`);
    }
  }
});

bot.on('error', err => {
  console.log('————— BIG ERROR —————');
  console.log(err);
  console.log('——— END BIG ERROR ———');
});

bot.on('voiceStateUpdate', async (o, n) => {
  // check if voice channel actually changed, don't mute bots
  if (!n.user.bot && (!o.voiceChannel || o.voiceChannelID != n.voiceChannelID)) {
    // is muted and joined a vc? maybe still muted from queue
    if (n.serverMute && n.voiceChannel && await data.isStillMuted(n.id, n.guild.id)) {
      n.setMute(false, 'was still muted from a queue which user disconnected from');
      data.toggleStillMuted(n.id, n.guild.id, false);
    }
    if (!n.serverMute && n.voiceChannel && bot.queueVoiceChannels[n.guild.id] && bot.queueVoiceChannels[n.guild.id] == n.voiceChannelID) {
      // user joined a muted channel
      n.setMute(true, 'joined active queue voice channel');
    } else if (n.serverMute && o.voiceChannel && bot.queueVoiceChannels[o.guild.id] && bot.queueVoiceChannels[o.guild.id] == o.voiceChannelID) {
      // user left a muted channel
      if (n.voiceChannel) {
        n.setMute(false, 'left active queue voice channel');
      } else {
        // save the unmute for later
        data.toggleStillMuted(n.id, n.guild.id, true);
      }
    } else if (n.voiceChannel && !await n.guild.me.voiceChannel && n.id != bot.user.id && !await data.isBlacklistedUser(n.id, n.guild.id) && await data.joinable(n.guild.id, n.voiceChannelID)) {
      if (await n.voiceChannel.permissionsFor(n.guild.me).has('CONNECT')) {
        const sound = await data.getSound(n.id, n.guild.id);
        if (sound) {
          n.voiceChannel.join().then(connection => {
            // TODO use connection.play when discord.js updates
            const dispatcher = connection.playArbitraryInput(sound, { seek: 0, volume: 0.2, passes: 1, bitrate: 'auto' });
            dispatcher.once('end', () => {
              connection.disconnect();
            });
          });
        }
      }
    }
  }
});

bot.on('disconnected', () => {
  console.log('Disconnected!');
});


bot.login(bot.TOKEN);
