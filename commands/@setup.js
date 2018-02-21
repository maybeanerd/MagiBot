var data = require(__dirname + '/../db.js');

function printHelp(msg, bot) {
    var info = [];

    info.push({
        name: "ban @User",
        value: "Deactivate all functions of the bot for a user",
        inline: true
    });
    info.push({
        name: "unban @User",
        value: "Reactivate all functions of the bot for a user",
        inline: true
    });
    info.push({
        name: "join[-/+]",
        value: "(De)activate joinsounds for the voicechannel you're connected to",
        inline: true
    });
    info.push({
        name: "admin[-/+] @Role",
        value: "(Un)set a role to be considered admin by the bot",
        inline: true
    });
    info.push({
        name: "command[-/+]",
        value: "(De)activate bot commands for the text channel you're sending this in",
        inline: true
    });
    info.push({
        name: "notification[-/+]",
        value: "(Un)set a textchannel to be notification channel",
        inline: true
    });
    info.push({
        name: "info",
        value: "Displays current settings",
        inline: true
    });

    let embed = {
        color: bot.COLOR,
        description: "Commands available via the prefix `" + bot.PREFIX + "@setup` :",
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
                            msg.channel.send("Successfully banned <@!" + mention + "> from using the bot.");
                        } else {
                            msg.channel.send("Error 404 you failed.");
                        }
                    } else {
                        msg.reply("you need to mention a user you want to use this on!");
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
                            msg.channel.send("Successfully activated the bot for <@!" + mention + "> again.");
                        } else {
                            msg.channel.send("Error 404 you failed.");
                        }
                    } else {
                        msg.channel.send("you need to mention a user you want to use this on!");
                        return;
                    }
                    break;
                case 'join+':
                    if (await msg.member.voiceChannelID) {
                        if (await data.setJoinable(msg.guild.id, msg.member.voiceChannelID, true)) {
                            msg.channel.send("Successfully activated joinsounds in **" + await msg.member.voiceChannel.name + "**.");
                        } else {
                            msg.channel.send("Error 404 you failed.");
                        }
                    } else {
                        msg.channel.send("You're in no voice channel!");
                    }
                    break;
                case 'join-':
                    if (await msg.member.voiceChannelID) {
                        if (await data.setJoinable(msg.guild.id, msg.member.voiceChannelID, false)) {
                            msg.channel.send("Successfully deactivated joinsounds in **" + await msg.member.voiceChannel.name + "**.");
                        } else {
                            msg.channel.send("Error 404 you failed.");
                        }
                    } else {
                        msg.channel.send("You're in no voice channel!");
                    }
                    break;
                case 'admin+':
                    if (mention.startsWith('<@&') && mention.endsWith('>')) {
                        mention = mention.substr(3).slice(0, -1);
                        if (await data.setAdmin(msg.guild.id, mention, true)) {
                            msg.channel.send("Successfully set <@&" + mention + "> as admin role!");
                        } else {
                            msg.channel.send("Error 404 you failed.");
                        }
                    } else {
                        msg.channel.send("You need to mention a role!");
                        return;
                    }
                    break;
                case 'admin-':
                    if (mention.startsWith('<@&') && mention.endsWith('>')) {
                        mention = mention.substr(3).slice(0, -1);
                        if (await data.setAdmin(msg.guild.id, mention, false)) {
                            msg.channel.send("Successfully removed <@&" + mention + "> from the admin roles!");
                        } else {
                            msg.channel.send("Error 404 you failed.");
                        }
                    } else {
                        msg.channel.send("You need to mention a role!");
                        return;
                    }
                    break;
                case 'command+':
                    if (await data.setCommandChannel(msg.guild.id, msg.channel.id, true)) {
                        msg.channel.send("Successfully activated commands in <#" + await msg.channel.id + ">.");
                    } else {
                        msg.channel.send("Error 404 you failed.");
                    }
                    break;
                case 'command-':
                    if (await data.setCommandChannel(msg.guild.id, msg.channel.id, false)) {
                        msg.channel.send("Successfully deactivated commands in <#" + await msg.channel.id + ">.");
                    } else {
                        msg.channel.send("Error 404 you failed.");
                    }
                    break;
                case 'notification+':
                    await data.setNotification(await msg.guild.id, await msg.channel.id);
                    msg.channel.send("Successfully activated notifications in <#" + await msg.channel.id + ">.").then(mess => { mess.delete(5000); msg.delete(); });
                    break;
                case 'notification-':
                    await data.setNotification(await msg.guild.id, false);
                    msg.channel.send("Successfully deactivated notifications.");
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
                        name: "Command channels",
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
                        name: "Admin roles",
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
                        name: "Joinsound channels",
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
                        name: "Blacklisted users",
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
                        name: "Channel with @everyone blacklist",
                        value: str,
                        inline: false
                    });

                    if (!set['saltKing']) {
                        str = "None";
                    } else {
                        str = "<@" + set['saltKing'] + ">";
                    }
                    info.push({
                        name: "SaltKing",
                        value: str,
                        inline: false
                    });
                    if (!set['saltRole']) {
                        str = "None";
                    } else {
                        str = "<@&" + set['saltRole'] + ">";
                    }
                    info.push({
                        name: "SaltKing role",
                        value: str,
                        inline: false
                    });
                    if (!set['notChannel']) {
                        str = "None";
                    } else {
                        str = "<#" + set['notChannel'] + ">";
                    }
                    info.push({
                        name: "Notification channel",
                        value: str,
                        inline: false
                    });

                    let embed = {
                        color: bot.COLOR,
                        description: "Guild settings of " + msg.guild.name + ":",
                        fields: info,
                        footer: {
                            icon_url: await msg.guild.iconURL,
                            text: await msg.guild.name
                        }
                    }
                    msg.channel.send('', { embed });
                    break;
                default:
                    msg.reply("this command doesn't exist. Use `" + bot.PREFIX + "@setup help` for more info.");
                    break;
            }
        }
    },
    help: 'Modify the settings for the bot',
    admin: true,
    hide: false
};
