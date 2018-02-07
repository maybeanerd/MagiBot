"use strict";

var Discord = require("discord.js");
var fs = require('fs');
var token = require(__dirname + '/token.js'); /*use \\ as path on Win and / on Unix*/
var data = require(__dirname + '/db.js');

var bot = new Discord.Client({ autoReconnect: true });

bot.OWNERID = token.owner;
bot.PREFIX = token.prefix;
bot.TOKEN = token.tk;

bot.DETAILED_LOGGING = true;
bot.DELETE_COMMANDS = false;

bot.COLOR = 0x351C75;
bot.SUCCESS_COLOR = 0x00ff00;
bot.ERROR_COLOR = 0x0000ff;
bot.INFO_COLOR = 0x0000ff;

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
commands.help.help = "Zeigt dir eine Liste der Befehle";
commands.help.admin = false;
commands.help.main = function (bot, msg) {
    var cmds = [];

    for (let command in commands) {
        if (!(commands[command].hide || commands[command].admin)) {
            cmds.push({
                name: command,
                value: commands[command].help,
                inline: true
            });
        }
    }

    let embed = {
        color: bot.COLOR,
        description: "Liste der Befehle die du mit dem Präfix " + bot.PREFIX + "! verwenden kannst:",
        fields: cmds,
        footer: {
            icon_url: bot.user.avatarURL,
            text: bot.user.username
        }
    }

    msg.channel.send('', { embed });
}

commands['@help'] = {};
commands['@help'].args = '';
commands['@help'].help = "Zeigt dir eine Liste der Admin Befehle";
commands['@help'].hide = true;
commands['@help'].admin = true;
commands['@help'].main = function (bot, msg) {
    var cmds = [];

    for (let command in commands) {
        if (commands[command].admin) {
            cmds.push({
                name: command.substr(1, command.length),
                value: commands[command].help,
                inline: true
            });
        }
    }

    let embed = {
        color: bot.COLOR,
        description: "Liste der Admin Befehle die du mit dem Präfix " + bot.PREFIX + "@ verwenden kannst:",
        fields: cmds,
        footer: {
            icon_url: bot.user.avatarURL,
            text: bot.user.username
        }
    }

    msg.channel.send('', { embed });
}

commands.load = {};
commands.load.args = '<command>';
commands.load.help = '';
commands.load.hide = true;
commands.load.admin = false;
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
        bot.sendNotification("Du hast nicht die Berechtigung diesen Befehl zu verwenden.", "error", msg);
    }
}

commands.unload = {};
commands.unload.args = '<command>';
commands.unload.help = '';
commands.unload.hide = true;
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
        bot.sendNotification("Du hast nicht die Berechtigung diesen Befehl zu verwenden.", "error", msg);
    }
}

commands.reload = {};
commands.reload.args = '';
commands.reload.help = '';
commands.reload.hide = true;
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
        bot.sendNotification("Du hast nicht die Berechtigung diesen Befehl zu verwenden.", "error", msg);
    }
}

var loadCommands = function () {
    var files = fs.readdirSync(__dirname + '/commands');
    for (let file of files) {
        if (file.endsWith('.js')) {
            commands[file.slice(0, -3)] = require(__dirname + '/commands/' + file);
            if (bot.DETAILED_LOGGING) console.log("Loaded " + file);
        }
    }
    console.log("———— All Commands Loaded! ————");
}

var checkCommand = async function (msg, isMention) {
    //ignore blacklisted users
    if (await data.isBlacklistedUser(msg.author.id, msg.guild.id)) {
        msg.delete();
        return;
    }
    if (isMention) {
        var command = msg.content.split(" ")[1];
        msg.content = msg.content.split(" ").splice(2, msg.content.split(' ').length).join(' ');

    } else {
        var command = msg.content.split(bot.PREFIX)[1].split(" ")[0];
        msg.content = msg.content.replace(bot.PREFIX + command + " ", "");
    }
    if (command) {
        var pre = command.charAt(0);
        switch (pre) {
            case '!':
                command = command.substr(1, command.length);
                break;
            case '@':
                if (!(msg.member && await data.isAdmin(msg.guild.id, msg.member))) {
                    msg.delete();
                    (msg.reply("Du hast nicht die Berechtigung, diesen Befehl zu nutzen.")).then(mess => mess.delete(5000));
                    return;
                }
                break;
            default:
                return;
        }
        if (command && commands[command]) {
            if (/*!msg.guild ||*/ pre == '@' || await data.commandAllowed(msg.guild.id, msg.channel.id)) {
                commands[command].main(bot, msg);
            } else {
                msg.delete();
                (msg.reply("Bot Befehle gehören nicht in <#" + msg.channel.id + ">, sondern" + await data.commandChannel(msg.guild.id) + ".")).then(mess => mess.delete(15000));
            }
        }
    }
}

bot.on("ready", () => {
    console.log('Ready to begin! Serving in ' + bot.guilds.array().length + ' servers.');
    bot.user.setActivity("nutze " + bot.PREFIX + "!help", { type: "WATCHING" });
    data.startup(bot);
    if (bot.DETAILED_LOGGING) {
        console.log('By name: ' + bot.guilds.array());
    }
    bot.user.setStatus("online", "");
    loadCommands();
});

bot.on("message", msg => {
    if (msg.content.startsWith('<@' + bot.user.id + '>') || msg.content.startsWith('<@!' + bot.user.id + '>')) {
        checkCommand(msg, true);
        if (bot.DELETE_COMMANDS) msg.delete();
    } else if (msg.content.startsWith(bot.PREFIX)) {
        if (msg.guild.member(bot.user).hasPermission("ADMINISTRATOR")) {
            //database stuff
            data.usageUp(msg.author.id, msg.guild.id);
            //end database stuff
            checkCommand(msg, false);
            if (bot.DELETE_COMMANDS) msg.delete();
        }
    }
});

bot.on("guildCreate", guild => {
    if (guild.available) {
        data.addGuild(guild.id);
        guild.owner.send("Hi there " + guild.owner.displayName + ".\nThanks for adding me to your server! If you have any need for help or want to help develop the bot by reporting bugs and requesting features, just join https://discord.gg/2Evcf4T\n\nTo setup the bot, use `"
            + bot.PREFIX + "@setup help`.\nYou should:\n\t- setup an admin role, as only you and users with administrative permission are able to use admin commands\n\t- add some text channels where users can use the bot\n\t- add voice channels in which the bot is allowed to " +
            "join to use joinsounds\n\nTo make sure the bot can do everything he needs to give him a role with administrative rights, if you have not done so yet in the invitation.\n\nThanks for being part of this project,\nBasti aka. the MagiBot Dev");
        let chan = bot.channels.get("408611226998800390");
        chan.send("joined " + guild.name);
    }
});

bot.on("guildDelete", guild => {
    if (guild.available) {
        let chan = bot.channels.get("408611226998800390");
        chan.send("left " + guild.name);
    }
});

bot.on('error', (err) => {
    console.log("————— BIG ERROR —————");
    console.log(err);
    console.log("——— END BIG ERROR ———");
});
var vcfree = true;

bot.on("voiceStateUpdate", async function (o, n) {
    if (vcfree && n.id != bot.user.id && !(await data.isBlacklistedUser(n.id, n.guild.id)) && await data.joinable(n.guild.id, n.voiceChannelID) && n.voiceChannel && (!o.voiceChannel || o.voiceChannelID != n.voiceChannelID)) {
        let sound = await data.getSound(n.id, n.guild.id);
        if (sound) {
            n.voiceChannel.join().then(connection => {
                //TODO use connection.play when discord.js updates
                const dispatcher = connection.playArbitraryInput(sound, { seek: 0, volume: 0.2, passes: 1, bitrate: 'auto' });
                dispatcher.on("start", () => {
                    vcfree = false;
                });
                dispatcher.on("end", () => {
                    if (!vcfree) {
                        connection.disconnect();
                        vcfree = true;
                    }
                });

            });
        }
    };
});

bot.on("disconnected", () => {
    console.log("Disconnected!");
});


bot.login(bot.TOKEN);