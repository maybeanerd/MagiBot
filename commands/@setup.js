var data = require(__dirname + '/../db.js');

function printHelp(msg, bot) {
    var info = [];

    info.push({
        name: "ban @User",
        value: "Deaktiviere alle Funktionen des Bots für einen Nutzer",
        inline: true
    });
    info.push({
        name: "unban @User",
        value: "Reaktiviere alle Funktionen des Bots für einen Nutzer",
        inline: true
    });
    info.push({
        name: "join+",
        value: "Aktiviere Joinsounds für den Voicechannel, mit dem du verbunden bist",
        inline: true
    });
    info.push({
        name: "join-",
        value: "Deaktiviere Joinsounds für den Voicechannel, mit dem du verbunden bist",
        inline: true
    });
    info.push({
        name: "admin+ @Role",
        value: "Lege eine Rolle als Adminrolle fest",
        inline: true
    });
    info.push({
        name: "admin- @Role",
        value: "Entferne eine Adminrolle",
        inline: true
    });
    info.push({
        name: "command+",
        value: "Aktiviere Botbfehle in dem Textchannel, in den du diese Nachricht sendest",
        inline: true
    });
    info.push({
        name: "command-",
        value: "Deaktiviere Botbfehle in dem Textchannel, in den du diese Nachricht sendest",
        inline: true
    });
    info.push({
        name: "notification-",
        value: "Deactivate the notification channel.",
        inline: true
    });
    info.push({
        name: "notification+",
        value: "Activate a text channel for notifications of the bot.",
        inline: true
    });
    info.push({
        name: "info",
        value: "Zeigt aktuelle Einstellungen",
        inline: true
    });

    let embed = {
        color: bot.COLOR,
        description: "Nutzbare Befehle in der Rubrik " + bot.PREFIX + "@setup :",
        fields: info,
        footer: {
            icon_url: bot.user.avatarURL,
            text: bot.user.username
        }
    }

    msg.channel.send('', { embed });
}


module.exports = {
    main: async function f(bot, msg) {
        const args = msg.content.split(/ +/);
        var command = args[0].toLowerCase();
        if (command == "help") {
            printHelp(msg, bot);
        } else {
            var mention = args[1];

            switch (command) {
                case 'ban':
                    if (mention.startsWith('<@') && mention.endsWith('>')) {
                        mention = mention.substr(2).slice(0, -1);
                        if (mention.startsWith('!')) {
                            mention = mention.substr(1);
                        }
                        if (await data.setBlacklistedUser(msg.guild.id, mention, true)) {
                            msg.channel.send("Du hast erfolgreich <@!" + mention + "> von Botfunktionen gebannt.");
                        } else {
                            msg.channel.send("Error 404 you failed.");
                        }
                    } else {
                        msg.channel.send("Du musst schon einen Nutzer angeben, auf den du das anwenden willst!");
                        return;
                    }
                    break;
                case 'unban':
                    if (mention.startsWith('<@') && mention.endsWith('>')) {
                        mention = mention.substr(2).slice(0, -1);
                        if (mention.startsWith('!')) {
                            mention = mention.substr(1);
                        }
                        if (await data.setBlacklistedUser(msg.guild.id, mention, false)) {
                            msg.channel.send("Du hast erfolgreich Botfunktionen für <@!" + mention + "> aktiviert.");
                        } else {
                            msg.channel.send("Error 404 you failed.");
                        }
                    } else {
                        msg.channel.send("Du musst schon einen Nutzer angeben, auf den du das anwenden willst!");
                        return;
                    }
                    break;
                case 'join+':
                    if (await msg.member.voiceChannelID) {
                        if (await data.setJoinable(msg.guild.id, msg.member.voiceChannelID, true)) {
                            msg.channel.send("Du hast erfolgreich Joinsounds in " + await msg.member.voiceChannel.name + " aktiviert.");
                        } else {
                            msg.channel.send("Error 404 you failed.");
                        }
                    } else {
                        msg.channel.send("Du bist in keinem Voice Channel!");
                    }
                    break;
                case 'join-':
                    if (await msg.member.voiceChannelID) {
                        if (await data.setJoinable(msg.guild.id, msg.member.voiceChannelID, false)) {
                            msg.channel.send("Du hast erfolgreich Joinsounds in " + await msg.member.voiceChannel.name + " deaktiviert.");
                        } else {
                            msg.channel.send("Error 404 you failed.");
                        }
                    } else {
                        msg.channel.send("Du bist in keinem Voice Channel!");
                    }
                    break;
                case 'admin+':
                    if (mention.startsWith('<@&') && mention.endsWith('>')) {
                        mention = mention.substr(3).slice(0, -1);
                        if (await data.setAdmin(msg.guild.id, mention, true)) {
                            msg.channel.send("Du hast erfolgreich <@&" + mention + "> als Admin Rolle eingestellt!");
                        } else {
                            msg.channel.send("Error 404 you failed.");
                        }
                    } else {
                        msg.channel.send("Du musst schon eine Rolle angeben, die als Administrator gelten soll!");
                        return;
                    }
                    break;
                case 'admin-':
                    if (mention.startsWith('<@&') && mention.endsWith('>')) {
                        mention = mention.substr(3).slice(0, -1);
                        if (await data.setAdmin(msg.guild.id, mention, false)) {
                            msg.channel.send("Du hast erfolgreich <@&" + mention + "> als Admin Rolle deaktiviert!");
                        } else {
                            msg.channel.send("Error 404 you failed.");
                        }
                    } else {
                        msg.channel.send("Du musst schon eine Rolle angeben, die als Administrator enfternt werden soll!");
                        return;
                    }
                    break;
                case 'command+':
                    if (await data.setCommandChannel(msg.guild.id, msg.channel.id, true)) {
                        msg.channel.send("Du hast erfolgreich Botbefehle in <#" + await msg.channel.id + "> aktiviert.");
                    } else {
                        msg.channel.send("Error 404 you failed.");
                    }
                    break;
                case 'command-':
                    if (await data.setCommandChannel(msg.guild.id, msg.channel.id, false)) {
                        msg.channel.send("Du hast erfolgreich Botbefehle in <#" + await msg.channel.id + "> deaktiviert.");
                    } else {
                        msg.channel.send("Error 404 you failed.");
                    }
                    break;
                case 'notification+':
                    await data.setNotification(await msg.guild.id, await msg.channel.id);
                    msg.channel.send("Du hast erfolgreich Notifications in <#" + await msg.channel.id + "> aktiviert.");
                    break;
                case 'notification-':
                    await data.setNotification(await msg.guild.id, false);
                    msg.channel.send("Du hast erfolgreich Notifications deaktiviert.");
                    break;
                case "info":
                    var info = [];
                    var set = await data.getSettings(msg.guild.id);

                    let str = "";
                    let cmd = set["commandChannels"];
                    if (!cmd.toString()) {
                        str = "Empty";
                    } else {
                        for (let s in cmd) {
                            str += "<#" + cmd[s] + "> ";
                        }
                    }
                    info.push({
                        name: "Command Channel",
                        value: str,
                        inline: false
                    });

                    str = "";
                    cmd = set["adminRoles"];
                    if (!cmd.toString()) {
                        str = "Empty";
                    } else {
                        for (let s in cmd) {
                            str += "<@&" + cmd[s] + "> ";
                        }
                    }
                    info.push({
                        name: "Adminrollen",
                        value: str,
                        inline: false
                    });

                    str = "";
                    cmd = set["joinChannels"];
                    if (!cmd.toString()) {
                        str = "Empty";
                    } else {
                        let guild = msg.guild;
                        for (let s in cmd) {
                            str += await guild.channels.get(cmd[s]).name + ", ";
                        }
                    }
                    info.push({
                        name: "Joinsound Channels",
                        value: str,
                        inline: false
                    });

                    str = "";
                    cmd = set["blacklistedUsers"];
                    if (!cmd.toString()) {
                        str = "Empty";
                    } else {
                        for (let s in cmd) {
                            str += "<@!" + cmd[s] + ">, ";
                        }
                    }
                    info.push({
                        name: "Blacklisted Users",
                        value: str,
                        inline: false
                    });

                    str = "";
                    cmd = set["blacklistedEveryone"];
                    if (!cmd.toString()) {
                        str = "Empty";
                    } else {
                        for (let s in cmd) {
                            str += "<#" + cmd[s] + ">, ";
                        }
                    }
                    info.push({
                        name: "Channel mit @everyone blacklist",
                        value: str,
                        inline: false
                    });

                    if (!set['saltKing']) {
                        str = "None";
                    } else {
                        str = "<@" + set['saltKing'] + ">";
                    }
                    info.push({
                        name: "Salt King",
                        value: str,
                        inline: false
                    });
                    if (!set['saltRole']) {
                        str = "None";
                    } else {
                        str = "<@&" + set['saltRole'] + ">";
                    }
                    info.push({
                        name: "Salt King Role",
                        value: str,
                        inline: false
                    });
                    if (!set['notChannel']) {
                        str = "None";
                    } else {
                        str = "<#" + set['notChannel'] + ">";
                    }
                    info.push({
                        name: "Notification Channel",
                        value: str,
                        inline: false
                    });

                    let embed = {
                        color: bot.COLOR,
                        description: "Server Einstellungen des " + msg.guild.name + ":",
                        fields: info,
                        footer: {
                            icon_url: await msg.guild.iconURL,
                            text: await msg.guild.name
                        }
                    }
                    msg.channel.send('', { embed });
                    break;
                default:
                    msg.reply("Dies ist kein gültiger Befehl. Nutze " + bot.PREFIX + "@setup help für mehr Information.");
                    break;
            }
        }
    },
    help: 'Verwalte die Einstellung des Bots auf dem Server',
    admin: true,
    hide: false
};
