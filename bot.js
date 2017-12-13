"use strict";

var Discord = require("discord.js");
var fs = require('fs');
var token = require(__dirname + '/token.js'); /*use \\ as path on Win and / on Unix*/
var sounds = require(__dirname + '/joinSounds.js');

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

//*prototyping area
var MongoClient = require('mongodb').MongoClient;

var url = "mongodb://T0TProduction:yourpassword@magibot-shard-00-00-1nbod.mongodb.net:27017,magibot-shard-00-01-1nbod.mongodb.net:27017,magibot-shard-00-02-1nbod.mongodb.net:27017/test?ssl=true&replicaSet=MagiBot-shard-0&authSource=admin";
MongoClient.connect(url, function (err, db) {
    // Paste the following examples here
    console.log("Database created!");
    db.close();
});

//create Collection
MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    //data about users (bans,warnings,etc.)
    db.createCollection("users", function (err, res) {
        if (err) throw err;
        console.log("User Collection created!");
    });
    //data about commands (usage count)
    db.createCollection("commands", function (err, res) {
        if (err) throw err;
        console.log("Command Collection created!");
    });
    db.createCollection("sounds", function (err, res) {
        if (err) throw err;
        console.log("Sound Collection created!");
    });
    //Dataset of settings (whitelist channels, etc.)
    db.createCollection("settings", function (err, res) {
        if (err) throw err;
        console.log("Settings Collection created!");
        db.close();
    });
});

//Define Methods:
function getUser(userid) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        db.collection("users").findOne({ _id: userid }, function (err, result) {
            if (err) throw err;
            db.close();
            return result;
        });
    });
}

function existsUser(userid) {
    if (getUser(userid)) { return true; }
    return false;
}

function addUser(userid) {
    if (existsUser(userid)) { console.log("This User already exists lol"); }
    else {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var myobj = { _id: userid, salt: 0, warnings: 0, bans: 0, kicks: 0, botusage: 0 };
            db.collection("users").insertOne(myobj, function (err, res) {
                if (err) throw err;
                console.log("1 User inserted");
                db.close();
            });
        });
    }
}

function updateUser(userid, update) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        db.collection("users").updateOne({ _id: userid }, update, function (err, res) {
            if (err) throw err;
            console.log("1 document updated");
            db.close();
        });
    });
}

function saltUp(userid) {
    var user = getUser(userid);
    updateUser(userid, { salt: user.salt + 1 });
}

//add TestData
addUser(bot.OWNERID);

//*/endof prototyping area

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

var checkCommand = function (msg, isMention) {
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
                if (!(msg.member && msg.member.roles.has('186032268995723264'))) {
                    msg.channel.send("Du hast nicht die Berechtigung, diesen Befehl zu nutzen.");
                    return;
                }
                break;
            default:
                return;
        }
        if (command && commands[command]) {
            if (msg.channel.id == '198764451132997632' || pre == '@') {
                commands[command].main(bot, msg);
            } else {
                msg.delete();
                (msg.reply("Bot Befehle gehören nicht in <#" + msg.channel.id + ">, sondern <#198764451132997632>.")).then(mess => mess.delete(15000));
            }
        }
    }
}

bot.on("ready", () => {
    console.log('Ready to begin! Serving in ' + bot.guilds.array().length + ' servers.');
    bot.user.setGame("nutze " + bot.PREFIX + "!help für Hilfe");
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
var vcfree = true;

function joinableChannel(cid) {
    return ((cid == "195175213367820288") || (cid == "218859225185648640") || (cid == "347741043485048842"));
};

bot.on("voiceStateUpdate", (o, n) => {
    if (vcfree && joinableChannel(n.voiceChannelID) && sounds.path(n.id) && n.voiceChannel && (!o.voiceChannel || o.voiceChannelID != n.voiceChannelID)) {
        n.voiceChannel.join().then(connection => {
            var dispatcher = connection.playArbitraryInput(sounds.path(n.id), { seek: 0, volume: 0.2, passes: 1, bitrate: 'auto' });
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
    };
});

bot.on("disconnected", () => {
    console.log("Disconnected!");
});


bot.login(bot.TOKEN);