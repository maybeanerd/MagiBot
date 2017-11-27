"use strict";

var Discord = require("discord.js");
var fs = require('fs');
var token = require(__dirname + 'token.js');

var bot = new Discord.Client({ autoReconnect: true });

bot.OWNERID = '185865492576075776';
bot.PREFIX = 'c';
bot.TOKEN = token.main();

bot.DETAILED_LOGGING = true;
bot.DELETE_COMMANDS = false;

bot.COLOR = 0x351C75;
bot.SUCCESS_COLOR = 0x00ff00;
bot.ERROR_COLOR = 0x0000ff;
bot.INFO_COLOR = 0x0000ff;

String.prototype.padRight = function (l, c) { return this + Array(l - this.length + 1).join(c || " ") }

var botChannels = {};

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
commands.help.main = function (bot, msg) {
    var cmds = [];

    for (let command in commands) {
        if (!commands[command].hide) {
            cmds.push({
                name: bot.PREFIX + command,
                value: commands[command].help,
                inline: true
            });
        }
    }

    let embed = {
        color: bot.COLOR,
        description: "Hier eine Liste der Befehle die du verwenden kannst:",
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

//for changing standard bot channel
commands.botC = {};
commands.botC.args = '';
commands.botC.help = '';
commands.botC.hide = true;
commands.botC.main = function (bot, msg) {
    if (msg.author.id == bot.OWNERID) {
        try {
            if (msg.content == "here") {
                botChannels[msg.guild] = msg.channel;
            }
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

var checkCommand = function (msg, isMention) {
    if (isMention) {
        var command = msg.content.split(" ")[1];
        msg.content = msg.content.split(" ").splice(2, msg.content.split(' ').length).join(' ');

    } else {
        var command = msg.content.split(bot.PREFIX)[1].split(" ")[0];
        msg.content = msg.content.replace(bot.PREFIX + command + " ", "");

    }
    if (command && commands[command]) {
        //temporary clunkyness:
        if (msg.content == "join" && !botChannels[msg.guild] && command == "band") {
            botChannels[msg.guild] = msg.channel;
        }
        commands[command].main(bot, msg);
    }
}

bot.on("ready", () => {
    bot.user.setGame("denselben Song nochmal");
    console.log('Ready to begin! Serving in ' + bot.guilds.array().length + ' servers.');
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
        checkCommand(msg, false);
        if (bot.DELETE_COMMANDS) msg.delete();
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