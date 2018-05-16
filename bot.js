"use strict";

var Discord = require("discord.js");
var fs = require('fs');
var token = require(__dirname + '/token.js'); /*use \\ as path on Win and / on Unix*/
var data = require(__dirname + '/db.js');

var bot = new Discord.Client({ autoReconnect: true });

var userCooldowns = new Set();

//Posting stats to Discord Bot List:
const DBL = require("dblapi.js");
const dbl = new DBL('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjM4NDgyMDIzMjU4MzI0OTkyMSIsImJvdCI6dHJ1ZSwiaWF0IjoxNTE5NTgyMjYyfQ.df01BPWTU8O711eB_hive_T6RUjgzpBtXEcVSj63RW0', bot);

process.on('uncaughtException', function (err) {
    let chann = bot.channels.get("414809410448261132");
    chann.send("**Exception:**\n```" + err.stack + "```");
});
process.on('unhandledRejection', function (err) {
    let chann = bot.channels.get("414809410448261132");
    chann.send("**Uncaught promise rejection:**\n```" + err.stack + "```");
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

bot.SIGN = "MagiBot - created by T0TProduction";

bot.PREFIXES = {};

String.prototype.padRight = function (l, c) { return this + Array(l - this.length + 1).join(c || " ") }

bot.sendNotification = function (info, type, msg) {
    var icolor;

    if (type == "success") icolor = bot.SUCCESS_COLOR;
    else if (type == "error") icolor = bot.ERROR_COLOR;
    else if (type == "info") icolor = bot.INFO_COLOR;
    else icolor = bot.COLOR;

    let embed = {
        color: icolor,
        description: info
    }
    msg.channel.send('', { embed });
}

var commands = {}

commands.help = {};
commands.help.args = '';
commands.help.help = "Shows all available commands";
commands.help.admin = false;
commands.help.perm = "SEND_MESSAGES";
commands.help.main = function (bot, msg) {
    const args = msg.content.split(/ +/);
    var command = args[0].toLowerCase();
    if (command) {
        if (!commands[command]) {
            msg.reply("this command does not exist. Use `" + bot.PREFIXES[msg.guild.id] + ".help` to get a full list of the commands available.");
        } else {
            if (commands[command].ehelp) {
                commands[command].ehelp(msg, bot);
            } else {
                msg.reply("there is no extended help available for this command.");
            }
        }
    } else {
        var cmds = [];

        for (let command in commands) {
            if (!(commands[command].hide || commands[command].admin)) {
                let nm = command;
                if (commands[command].dev) {
                    nm = "Under construction: " + nm;
                }
                cmds.push({
                    name: nm,
                    value: commands[command].help,
                    inline: true
                });
            }
        }

        let embed = {
            color: bot.COLOR,
            description: "Commands available via the prefix `" + bot.PREFIXES[msg.guild.id] + ".` :\nto get more info on a single command use `" + bot.PREFIXES[msg.guild.id] + ".help <command>`",
            fields: cmds,
            footer: {
                icon_url: bot.user.avatarURL,
                text: "to get admin commands use " + bot.PREFIXES[msg.guild.id] + ":help"
            }
        }

        msg.channel.send('', { embed });
    }
}

commands['@help'] = {};
commands['@help'].args = '';
commands['@help'].help = "Shows all available admin commands";
commands['@help'].hide = false;
commands['@help'].admin = true;
commands['@help'].perm = "SEND_MESSAGES";
commands['@help'].main = function (bot, msg) {
    const args = msg.content.split(/ +/);
    var command = args[0].toLowerCase();
    if (command) {
        command = "@" + command;
        if (!commands[command]) {
            msg.reply("this command does not exist. Use `" + bot.PREFIXES[msg.guild.id] + ":help` to get a full list of the admin commands available.");
        } else {
            if (commands[command].ehelp) {
                commands[command].ehelp(msg, bot);
            } else {
                msg.reply("there is no extended help available for this command.");
            }
        }
    } else {
        var cmds = [];

        for (let command in commands) {
            if (commands[command].admin && !commands[command].hide) {
                let nm = command.substr(1, command.length);
                if (commands[command].dev) {
                    nm = "Under construction: " + nm;
                }
                cmds.push({
                    name: nm,
                    value: commands[command].help,
                    inline: true
                });
            }

        }

        let embed = {
            color: bot.COLOR,
            description: "Commands available via the prefix `" + bot.PREFIXES[msg.guild.id] + ":` :\nto get more info on a single command use `" + bot.PREFIXES[msg.guild.id] + ":help <command>`",
            fields: cmds,
            footer: {
                icon_url: bot.user.avatarURL,
                text: "to get standard commands use " + bot.PREFIXES[msg.guild.id] + ".help"
            }
        }

        msg.channel.send('', { embed });
    }
}

commands.load = {};
commands.load.args = '<command>';
commands.load.help = '';
commands.load.hide = true;
commands.load.admin = false;
commands.load.dev = true;
commands.load.main = function (bot, msg) {
    if (msg.author.id == bot.OWNERID) {
        try {
            delete commands[msg.content];
            delete require.cache[__dirname + '/commands/' + msg.content + '.js'];
            commands[msg.content] = require(__dirname + '/commands/' + msg.content + '.js');
            bot.sendNotification("Loaded " + msg.content + ".js succesfully.", "success", msg);
        } catch (err) {
            bot.sendNotification("The command was not found, or there was an error loading it.", "error", msg);
        }
    } else {
        bot.sendNotification("You're not allowed to use this..", "error", msg);
    }
}

commands.unload = {};
commands.unload.args = '<command>';
commands.unload.help = '';
commands.unload.hide = true;
commands.unload.dev = true;
commands.unload.admin = false;
commands.unload.main = function (bot, msg) {
    if (msg.author.id == bot.OWNERID) {
        try {
            delete commands[msg.content];
            delete require.cache[__dirname + '/commands/' + msg.content + '.js'];
            bot.sendNotification("Unloaded " + msg.content + ".js succesfully.", "success", msg);
        }
        catch (err) {
            bot.sendNotification("Command not found.", "error", msg);
        }
    } else {
        bot.sendNotification("You're not allowed to use this..", "error", msg);
    }
}

commands.reload = {};
commands.reload.args = '';
commands.reload.help = '';
commands.reload.hide = true;
commands.reload.dev = true;
commands.reload.admin = false;
commands.reload.main = function (bot, msg) {
    if (msg.author.id == bot.OWNERID) {
        try {
            delete commands[msg.content];
            delete require.cache[__dirname + '/commands/' + msg.content + '.js'];
            commands[args] = require(__dirname + '/commands/' + msg.content + '.js');
            bot.sendNotification("Reloaded " + msg.content + ".js successfully.", "success", msg);
        }
        catch (err) {
            msg.channel.sen("Command not found");
        }
    } else {
        bot.sendNotification("You're not allowed to use this..", "error", msg);
    }
}

var loadCommands = function () {
    var files = fs.readdirSync(__dirname + '/commands');
    for (let file of files) {
        if (file.endsWith('.js')) {
            commands[file.slice(0, -3)] = require(__dirname + '/commands/' + file);
            if (bot.DETAILED_LOGGING) {
                console.log("Loaded " + file);
            }
        }
    }
    console.log("———— All Commands Loaded! ————");
}

var checkCommand = async function (msg, isMention) {
    //ignore blacklisted users
    if (await data.isBlacklistedUser(await msg.author.id, await msg.guild.id)) {
        msg.delete();
        return;
    }
    if (isMention) {
        var command = msg.content.split(" ")[1];
        msg.content = msg.content.split(" ").splice(2, msg.content.split(' ').length).join(' ');
        command = "." + command;
    } else {
        var command = msg.content.substring(bot.PREFIXES[msg.guild.id].length, msg.content.length).split(" ")[0].toLowerCase();
        msg.content = msg.content.slice(command.length + bot.PREFIXES[msg.guild.id].length); //delete prefix and command
        msg.content = msg.content.replace(/^\s+/g, ''); //delete leading spaces
    }
    if (command) {
        await data.usageUp(msg.author.id, msg.guild.id);
        var pre = command.charAt(0);
        switch (pre) {
            case '.':
                command = command.slice(1);
                break;
            case ':':
                if (!(msg.member && await data.isAdmin(msg.guild.id, msg.member))) {
                    if (await msg.channel.permissionsFor(msg.guild.me).has("MANAGE_MESSAGES")) {
                        msg.delete();
                    }
                    if (await msg.channel.permissionsFor(msg.guild.me).has("SEND_MESSAGES")) {
                        (msg.reply("you're not allowed to use this command.")).then(mess => mess.delete(5000));
                    }
                    return;
                }
                command = "@" + command.slice(1);
                //check if its an admin command, if not you're allowed to use the normal version as admin (in any channel)
                if (!commands[command]) {
                    command = command.slice(1);
                }
                break;
            default:
                return;
        }
        if (commands[command] && (!(commands[command].dev) || msg.author.id == bot.OWNERID)) {
            if (pre == ':' || await data.commandAllowed(msg.guild.id, msg.channel.id)) {
                let perms = commands[command].perm;
                if (!perms || await msg.channel.permissionsFor(msg.guild.me).has(perms)) {
                    //cooldown for command usage
                    if (!userCooldowns.has(msg.author.id) ) {
                        userCooldowns.add(msg.author.id);
        setTimeout(()=>{userCooldowns.delete(msg.author.id);}, 4000);
                        commands[command].main(bot, msg);
                    } else {
                        if (await msg.channel.permissionsFor(msg.guild.me).has("SEND_MESSAGES")) {
                            msg.reply("whoa cool down, you're using commands too quick!");
                        }
                    }
                    //endof cooldown management
                } else {
                    if (await msg.channel.permissionsFor(msg.guild.me).has("SEND_MESSAGES")) {
                        msg.channel.send("I don't have the permissions needed for this command. (" + perms + ") ");
                    }
                }
            } else {

                if (await msg.channel.permissionsFor(msg.guild.me).has("SEND_MESSAGES")) {
                    if (await msg.channel.permissionsFor(msg.guild.me).has("MANAGE_MESSAGES")) {
                        msg.delete();
                    }
                    (msg.reply("commands aren't allowed in <#" + msg.channel.id + ">. Use them in " + await data.commandChannel(msg.guild.id) + ". If you're an admin use `" + bot.PREFIX + ":help` to see how you can change that.")).then(mess => mess.delete(15000));
                }
            }
        }
    }
}

bot.on("ready", () => {
    console.log('Ready to begin! Serving in ' + bot.guilds.array().length + ' servers.');
    bot.user.setActivity("use " + bot.PREFIX + ".help", { type: "WATCHING" });
    data.startup(bot);
    if (bot.DETAILED_LOGGING) {
        console.log('By name: ' + bot.guilds.array());
    }
    bot.user.setStatus("online", "");
    loadCommands();
    data.getPrefixesE(bot);
    let chann = bot.channels.get("382233880469438465");
    chann.send("Im up and ready!");
});

bot.on("message", msg => {
    if (!msg.author.bot && msg.guild) {
        if (msg.content.startsWith('<@' + bot.user.id + '>') || msg.content.startsWith('<@!' + bot.user.id + '>')) {
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

bot.on("guildCreate", guild => {
    if (guild.available) {
        guildPrefixStartup(guild);
        guild.owner.send("Hi there " + guild.owner.displayName + ".\nThanks for adding me to your server! If you have any need for help or want to help develop the bot by reporting bugs and requesting features, just join https://discord.gg/2Evcf4T\n\nTo setup the bot, use `"
            + bot.PREFIX + ":help setup`.\nYou should:\n\t- setup an admin role, as only you and users with administrative permission are able to use admin commands\n\t- add some text channels where users can use the bot\n\t- add voice channels in which the bot is allowed to " +
            "join to use joinsounds\n\t- add a notification channel where bot updates and information will be posted\n\nTo make sure the bot can do everything he needs to give him a role with administrative rights, if you have not done so yet in the invitation.\n\nThanks for being part of this project,\nBasti aka. the MagiBot Dev").catch(() => { });
        let chan = bot.channels.get("408611226998800390");
        chan.send(":white_check_mark: joined **" + guild.name + "** from " + guild.region + " (" + guild.memberCount + " users, ID: " + guild.id + ")\nOwner is: <@" + guild.ownerID + "> (ID: " + guild.ownerID + ")");
    }
});

bot.on("guildDelete", guild => {
    if (guild.available) {
        let chan = bot.channels.get("408611226998800390");
        chan.send(":x: left " + guild.name + " (" + guild.memberCount + " users, ID: " + guild.id + ")");
    }
});

bot.on('error', (err) => {
    console.log("————— BIG ERROR —————");
    console.log(err);
    console.log("——— END BIG ERROR ———");
});

bot.on("voiceStateUpdate", async function (o, n) {
    if (!(await n.guild.me.voiceChannel) && n.id != bot.user.id && !(await data.isBlacklistedUser(n.id, n.guild.id)) && await data.joinable(n.guild.id, n.voiceChannelID) && n.voiceChannel && (!o.voiceChannel || o.voiceChannelID != n.voiceChannelID)) {
        if (await n.voiceChannel.permissionsFor(n.guild.me).has("CONNECT")) {
            let sound = await data.getSound(n.id, n.guild.id);
            if (sound) {
                n.voiceChannel.join().then(connection => {
                    //TODO use connection.play when discord.js updates, get rid of nested listener
                    const dispatcher = connection.playArbitraryInput(sound, { seek: 0, volume: 0.2, passes: 1, bitrate: 'auto' });
                    dispatcher.on("end", () => {
                        connection.disconnect();
                    });

                });
            }
        }
    };
});

bot.on("disconnected", () => {
    console.log("Disconnected!");
});


bot.login(bot.TOKEN);