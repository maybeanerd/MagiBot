/* eslint-disable strict*/
'use strict';
/* eslint-enable strict*/

const Discord = require('discord.js');
const fs = require('fs');
const token = require(`${__dirname}/token.js`); /* use \\ as path on Win and / on Unix*/

const bot = new Discord.Client({ autoReconnect: true });

const userCooldowns = new Set();


process.on('uncaughtException', err => {
  const chann = bot.channels.get('414809410448261132');
  chann.send(`**Exception:**\n\`\`\`${err.stack}\`\`\``);
});
process.on('unhandledRejection', err => {
  const chann = bot.channels.get('414809410448261132');
  chann.send(`**Uncaught promise rejection:**\n\`\`\`${err.stack}\`\`\``);
});


bot.OWNERID = token.owner;
bot.PREFIX = token.prefix;
bot.TOKEN = token.tk;

bot.DETAILED_LOGGING = true;
bot.DELETE_COMMANDS = false;

bot.COLOR = 0x351C75;
bot.SUCCESS_COLOR = 0x00ff00;
bot.ERROR_COLOR = 0x0000ff;
bot.INFO_COLOR = 0x0000ff;

// global variables saved in bot

bot.SIGN = 'TeaPot - created by T0TProduction#0001';

/* eslint-disable no-extend-native */
String.prototype.padRight = function padRight(l, c) {
  return this + Array(l - this.length + 1).join(c || ' ');
};
/* eslint-enable no-extend-native */
function isAdmin(member) {
  return member.id == bot.OWNERID;
}

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
      msg.reply(`this command does not exist. Use \`${bot.PREFIX}.help\` to get a full list of the commands available.`);
    } else if (commands[command]) {
      if (commands[command].ehelp) {
        let info = [];
        let ehelps = commands[command].ehelp(msg, bot);
        for (const i in ehelps) {
          info.push({
            name: `${bot.PREFIX}.${command} ${ehelps[i].name}`,
            value: ehelps[i].value,
            inline: false
          });
        }
        let embed = {
          color: bot.COLOR,
          description: `Commands available via the prefix \`${bot.PREFIX}.${command}\`:`,
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
        if (msg.member && await isAdmin(msg.member)) {
          if (commands[acommand] && commands[acommand].ehelp) {
            info = [];
            ehelps = commands[acommand].ehelp(msg, bot);
            for (const i in ehelps) {
              info.push({
                name: `${bot.PREFIX}:${acommand.slice(1)} ${ehelps[i].name}`,
                value: ehelps[i].value,
                inline: false
              });
            }

            embed = {
              color: bot.COLOR,
              description: `Admin commands available via the prefix \`${bot.PREFIX}:${command}\`:`,
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
    } else if (msg.member && await isAdmin(msg.member)) {
      // Only Admin command
      command = acommand;
      if (commands[command].ehelp) {
        const info = [];
        const ehelps = commands[command].ehelp(msg, bot);
        for (const i in ehelps) {
          info.push({
            name: `${bot.PREFIX}:${command.slice(1)} ${ehelps[i].name}`,
            value: ehelps[i].value,
            inline: false
          });
        }
        const embed = {
          color: bot.COLOR,
          description: `Admin commands available via the prefix \`${bot.PREFIX}:${command.slice(1)}\`:`,
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
      description: `Commands available via the prefix \`${bot.PREFIX}.\` :\nto get more info on a single command use \`${bot.PREFIX}.help <command>\``,
      fields: cmds,
      footer: {
        /* eslint-disable camelcase */
        icon_url: bot.user.avatarURL,
        /* eslint-enable camelcase */
        text: `admins can override commands with ${bot.PREFIX}: instead of ${bot.PREFIX}. to ignore command channel restrictions`
      }
    };
    msg.channel.send('', { embed });
    if (msg.member && await isAdmin(msg.member)) {
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
        description: `Admin commands available via the prefix \`${bot.PREFIX}:\` :\nto get more info on a single command use \`${bot.PREFIX}.help <command>\``,
        fields: cmds,
        footer: {
          /* eslint-disable camelcase */
          icon_url: bot.user.avatarURL,
          /* eslint-enable camelcase */
          text: `admins can override commands with ${bot.PREFIX}: instead of ${bot.PREFIX}. to ignore command channel restrictions`
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
  if (msg.channel.id != '402946769190780939' && !isAdmin(msg.member)) {
    msg.reply('you can only use this bot in #402946769190780939').then(mess => mess.delete(5000));
    msg.delete();
  }
  let command;
  if (isMention) {
    command = msg.content.split(' ')[1];
    msg.content = msg.content.split(' ').splice(2, msg.content.split(' ').length).join(' ');
    command = `.${command}`;
  } else {
    command = msg.content.substring(bot.PREFIX.length, msg.content.length).split(' ')[0].toLowerCase();
    msg.content = msg.content.slice(command.length + bot.PREFIX.length); // delete prefix and command
    msg.content = msg.content.replace(/^\s+/g, ''); // delete leading spaces
  }
  if (command) {
    const pre = command.charAt(0);
    switch (pre) {
    case '.':
      command = command.slice(1);
      break;
    case ':':
      if (!(msg.member && isAdmin(msg.member))) {
        if (await msg.channel.permissionsFor(msg.guild.me).has('MANAGE_MESSAGES')) {
          msg.delete();
        }
        if (await msg.channel.permissionsFor(msg.guild.me).has('SEND_MESSAGES')) {
          msg.reply("you're not allowed to use this command.").then(mess => mess.delete(5000));
        }
        return;
      }
      command = `@${command.slice(1)}`;
      // check if its an admin command, if not you're allowed to use the normal version as admin (in any channel)
      if (!commands[command]) {
        command = command.slice(1);
      }
      break;
    default:
      return;
    }
    if (commands[command] && (!commands[command].dev || msg.author.id == bot.OWNERID)) {
      const perms = commands[command].perm;
      if (!perms || await msg.channel.permissionsFor(msg.guild.me).has(perms)) {
        // cooldown for command usage
        if (!userCooldowns.has(msg.author.id)) {
          userCooldowns.add(msg.author.id);
          setTimeout(() => {
            userCooldowns.delete(msg.author.id);
          }, 4000);
          commands[command].main(bot, msg);
        } else if (await msg.channel.permissionsFor(msg.guild.me).has('SEND_MESSAGES')) {
          msg.reply("whoa cool down, you're using commands too quick!");
        }
        // endof cooldown management
      } else if (await msg.channel.permissionsFor(msg.guild.me).has('SEND_MESSAGES')) {
        msg.channel.send(`I don't have the permissions needed for this command. (${perms}) `);
      }
    }
  }
};

bot.on('ready', () => {
  console.log(`Ready to begin! Serving in ${bot.guilds.array().length} servers.`);
  bot.user.setActivity(`${bot.PREFIX}.help`, { type: 'WATCHING' });
  if (bot.DETAILED_LOGGING) {
    console.log(`By name: ${bot.guilds.array()}`);
  }
  bot.user.setStatus('online', '');
  loadCommands();
  const chann = bot.channels.get('382233880469438465');
  chann.send('Im up and ready!');
});

const isInvLink = /(?:discord(?:(?:\.|.?dot.?)gg|app(?:\.|.?dot.?)com\/invite)\/(([\w]{10,16}|[a-z0-9]{4,8})))/i;

bot.on('message', msg => {
  if (!msg.author.bot && msg.guild) {
    if (isInvLink.test(msg.content)) {
      msg.reply(" server invites aren't allowed here.");
      msg.delete();
      return;
    }
    if (msg.content.startsWith(`<@${bot.user.id}>`) || msg.content.startsWith(`<@!${bot.user.id}>`)) {
      checkCommand(msg, true);
      if (bot.DELETE_COMMANDS) msg.delete();
    } else if (msg.content.startsWith(bot.PREFIX)) {
      checkCommand(msg, false);
      if (bot.DELETE_COMMANDS) msg.delete();
    }
  }
});


bot.on('error', err => {
  console.log('————— BIG ERROR —————');
  console.log(err);
  console.log('——— END BIG ERROR ———');
});

bot.on('disconnected', () => {
  console.log('Disconnected!');
});


bot.login(bot.TOKEN);
