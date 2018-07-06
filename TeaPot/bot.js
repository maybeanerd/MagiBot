"use strict";

var Discord = require("discord.js");
var fs = require('fs');
var token = require(__dirname + '/token.js'); /*use \\ as path on Win and / on Unix*/

var bot = new Discord.Client({ autoReconnect: true });

var userCooldowns = new Set();


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

//global variables saved in bot

bot.SIGN = "TeaPot - created by T0TProduction#0001";

String.prototype.padRight = function (l, c) { return this + Array(l - this.length + 1).join(c || " ") }

function isAdmin(member) {
    return member.id == bot.OWNERID;
}

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
var commandCategories = ["Utility", "Fun", "Miscellaneous"];

commands.help = {};
commands.help.args = '';
commands.help.help = "Shows all available commands";
commands.help.admin = false;
commands.help.perm = "SEND_MESSAGES";
commands.help.main = async function (bot, msg) {
    const args = msg.content.split(/ +/);
    var command = args[0].toLowerCase();
    //extended help
    if (command) {
        var acommand = "@" + command;
        if (!(commands[command] || commands[acommand])) {
            msg.reply("this command does not exist. Use `" + bot.PREFIXES[msg.guild.id] + ".help` to get a full list of the commands available.");
        } else {
            if (commands[command]) {
                if (commands[command].ehelp) {
                    var info = [];
                    var ehelps = commands[command].ehelp(msg, bot);
                    for (var i in ehelps) {
                        info.push({
                            name: bot.PREFIXES[msg.guild.id] + "." + command + " " + ehelps[i].name,
                            value: ehelps[i].value,
                            inline: false
                        });

                    }
                    let embed = {
                        color: bot.COLOR,
                        description: "Commands available via the prefix `" + bot.PREFIXES[msg.guild.id] + "." + command + "`:",
                        fields: info,
                        footer: {
                            icon_url: bot.user.avatarURL,
                            text: "<required input> , [optional input] , choose|one|of|these , (comment on the command)"
                        }
                    }

                    msg.channel.send('', { embed });
                    //admin variant?
                    if (msg.member && isAdmin(msg.member)) {
                        if (commands[acommand] && commands[acommand].ehelp) {
                            info = [];
                            var ehelps = commands[acommand].ehelp(msg, bot);
                            for (var i in ehelps) {
                                info.push({
                                    name: bot.PREFIXES[msg.guild.id] + ":" + acommand.slice(1) + " " + ehelps[i].name,
                                    value: ehelps[i].value,
                                    inline: false
                                });
                            }

                            embed = {
                                color: bot.COLOR,
                                description: "Admin commands available via the prefix `" + bot.PREFIXES[msg.guild.id] + ":" + command + "`:",
                                fields: info,
                                footer: {
                                    icon_url: bot.user.avatarURL,
                                    text: "<required input> , [optional input] , choose|one|of|these , (comment on the command)"
                                }
                            }

                            msg.channel.send('', { embed });
                        }
                    }

                } else {
                    msg.reply("there is no extended help available for this command.");
                }
            } else if (msg.member && isAdmin(msg.member)) {
                //Only Admin command
                command = acommand;
                if (commands[command].ehelp) {
                    var info = [];
                    var ehelps = commands[command].ehelp(msg, bot);
                    for (var i in ehelps) {
                        info.push({
                            name: bot.PREFIXES[msg.guild.id] + ":" + command.slice(1) + " " + ehelps[i].name,
                            value: ehelps[i].value,
                            inline: false
                        });

                    }
                    let embed = {
                        color: bot.COLOR,
                        description: "Admin commands available via the prefix `" + bot.PREFIXES[msg.guild.id] + ":" + command.slice(1) + "`:",
                        fields: info,
                        footer: {
                            icon_url: bot.user.avatarURL,
                            text: "<required input> , [optional input] , choose|one|of|these , (comment on the command)"
                        }
                    }

                    msg.channel.send('', { embed });
                } else {
                    msg.reply("there is no extended help available for this command.");
                }

            }
        }
    } else {
        //normal help, sort by categories
        var cmds = [];
        for (var i in commandCategories) {
            var cat = commandCategories[i];
            var coms = "";
            for (let command in commands) {
                if (commands[command].category == cat && (!(commands[command].hide || commands[command].admin))) {
                    let nm = command;
                    if (commands[command].dev) {
                        nm = nm + " (dev only)";
                    }
                    coms += nm + " ";
                }
            }
            if (coms != "") {
                cmds.push({
                    name: cat + " commands",
                    value: coms,
                    inline: false
                });
            }
        }
        let embed = {
            color: bot.COLOR,
            description: "Commands available via the prefix `" + bot.PREFIXES[msg.guild.id] + ".` :\nto get more info on a single command use `" + bot.PREFIXES[msg.guild.id] + ".help <command>`",
            fields: cmds,
            footer: {
                icon_url: bot.user.avatarURL,
                text: "admins can override commands with " + bot.PREFIXES[msg.guild.id] + ": instead of " + bot.PREFIXES[msg.guild.id] + ". to ignore command channel restrictions"
            }
        }
        msg.channel.send('', { embed });
        if (msg.member && isAdmin(msg.member)) {
            cmds = [];
            var coms = "";
            for (let command in commands) {
                if (commands[command].admin && !commands[command].hide) {
                    let nm = command.substr(1, command.length);
                    if (commands[command].dev) {
                        nm = nm + " (dev only)";
                    }
                    coms += nm + " ";
                }
            }
            if (coms != "") {
                cmds.push({
                    name: "Admin commands",
                    value: coms,
                    inline: false
                });
            }
            embed = {
                color: bot.COLOR,
                description: "Admin commands available via the prefix `" + bot.PREFIXES[msg.guild.id] + ":` :\nto get more info on a single command use `" + bot.PREFIXES[msg.guild.id] + ".help <command>`",
                fields: cmds,
                footer: {
                    icon_url: bot.user.avatarURL,
                    text: "admins can override commands with " + bot.PREFIXES[msg.guild.id] + ": instead of " + bot.PREFIXES[msg.guild.id] + ". to ignore command channel restrictions"
                }
            }
            msg.channel.send('', { embed });
        }



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
            msg.channel.send("Command not found");
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
        var pre = command.charAt(0);
        switch (pre) {
            case '.':
                command = command.slice(1);
                break;
            case ':':
                if (!(msg.member && isAdmin(msg.member))) {
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
            let perms = commands[command].perm;
            if (!perms || await msg.channel.permissionsFor(msg.guild.me).has(perms)) {
                //cooldown for command usage
                if (!userCooldowns.has(msg.author.id)) {
                    userCooldowns.add(msg.author.id);
                    setTimeout(() => { userCooldowns.delete(msg.author.id); }, 4000);
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
        }
    }
}

bot.on("ready", () => {
    console.log('Ready to begin! Serving in ' + bot.guilds.array().length + ' servers.');
    bot.user.setActivity(bot.PREFIX + ".help", { type: "WATCHING" });
    if (bot.DETAILED_LOGGING) {
        console.log('By name: ' + bot.guilds.array());
    }
    bot.user.setStatus("online", "");
    loadCommands();
    let chann = bot.channels.get("382233880469438465");
    chann.send("Im up and ready!");
});

var isInvLink = /(?:discord(?:(?:\.|.?dot.?)gg|app(?:\.|.?dot.?)com\/invite)\/(([\w]{10,16}|[a-z0-9]{4,8})))/i;

bot.on("message", msg => {
    if (!msg.author.bot && msg.guild) {
        if (isInvLink.test(msg.content)) {
            msg.reply(" server invites aren't allowed here.");
            msg.delete();
            return;
        }
        if (msg.content.startsWith('<@' + bot.user.id + '>') || msg.content.startsWith('<@!' + bot.user.id + '>')) {
            checkCommand(msg, true);
            if (bot.DELETE_COMMANDS) msg.delete();
        } else if (msg.content.startsWith(bot.PREFIXES[msg.guild.id])) {
            checkCommand(msg, false);
            if (bot.DELETE_COMMANDS) msg.delete();
        }
    }
});



bot.on('error', (err) => {
    console.log("————— BIG ERROR —————");
    console.log(err);
    console.log("——— END BIG ERROR ———");
});

bot.on("disconnected", () => {
    console.log("Disconnected!");
});


bot.login(bot.TOKEN);