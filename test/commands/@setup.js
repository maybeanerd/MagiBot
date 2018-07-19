var data = require(__dirname + '/../db.js');
var cmds = require(__dirname + '/../bamands.js');

function printHelp(msg, bot) {
    var info = [];

    info.push({
        name: "ban <@User>",
        value: "Deactivate all functions of the bot for a user",
    });
    info.push({
        name: "unban <@User>",
        value: "Reactivate all functions of the bot for a user",
    });
    info.push({
        name: "join",
        value: "(De)activate joinsounds for the voicechannel you're connected to",
    });
    info.push({
        name: "admin <@Role>",
        value: "(Un)set a role to be considered admin by the bot",
    });
    info.push({
        name: "command",
        value: "(De)activate bot commands for the text channel you're sending this in",
    });
    info.push({
        name: "notification",
        value: "(Un)set a textchannel to be notification channel",
    });
    info.push({
        name: "info",
        value: "Displays current settings",
    });
    info.push({
        name: "prefix <prefix>",
        value: "Set a custom character or string as prefix",
    });

    return info;
}


module.exports = {
    main: async function f(bot, msg) {
        const args = msg.content.split(/ +/);
        var command = args[0].toLowerCase();

        var mention = args[1];

        switch (command) {
            case 'ban':
                var uid = await cmds.findMember(msg.guild, mention);
                if (mention && uid) {
                    if (await cmds.yesOrNo(msg, "Do you really want to ban <@!" + uid + "> from using the bot?", "Successfully canceled ban.")) {
                        data.setBlacklistedUser(msg.guild.id, uid, true);
                        msg.channel.send("Successfully banned <@!" + uid + "> from using the bot.");
                    }
                } else {
                    msg.reply("you need to mention a user you want to use this on!");
                }
                break;
            case 'unban':
                var uid = await cmds.findMember(msg.guild, mention);
                if (mention && uid) {
                    if (await cmds.yesOrNo(msg, "Do you really want to reactivate bot usage for <@!" + uid + ">?", "Successfully canceled unban.")) {
                        data.setBlacklistedUser(msg.guild.id, uid, false);
                        msg.channel.send("Successfully banned <@!" + uid + "> from using the bot.");
                    }
                } else {
                    msg.reply("you need to mention a user you want to use this on!");
                }
                break;
            case 'join':
                var voiceChannel = await msg.member.voiceChannel;
                if (voiceChannel) {
                    var isJoinable = await data.isJoinable(msg.guild.id, voiceChannel.id);
                    var de = "";
                    if (isJoinable) {
                        de = "de";
                    }
                    if (await cmds.yesOrNo(msg, "Do you want to " + de + "activate joinsounds in **" + voiceChannel.name + "**?", "Cancelled " + de + "activating joinsounds in **" + voiceChannel.name + "**.")) {
                        await data.setJoinable(msg.guild.id, voiceChannel.id, !isJoinable)
                        msg.channel.send("Successfully " + de + "activated joinsounds in **" + voiceChannel.name + "**.");
                    }
                } else {
                    msg.channel.send("You're connected to no voice channel!");
                }
                break;
            case 'admin':
                var rid = await cmds.findRole(msg.guild, mention);
                if (mention && rid) {
                    if (!(await data.isAdminRole(msg.guild.id, rid))) {
                        if (await cmds.yesOrNo(msg, "Do you want to set <@&" + rid + "> as admin role?", "Cancelled setting <@&" + rid + "> as admin role")) {
                            await data.setAdmin(msg.guild.id, rid, true);
                            msg.channel.send("Successfully set <@&" + rid + "> as admin role!");
                        }
                    } else {
                        if (await cmds.yesOrNo(msg, "Do you want to remove <@&" + rid + "> from the admin roles?", "Cancelled removing <@&" + rid + "> from the admin roles")) {
                            await data.setAdmin(msg.guild.id, rid, false);
                            msg.channel.send("Successfully removed <@&" + rid + "> from the admin roles!");
                        }
                    }
                } else {
                    msg.channel.send("You need to mention a role!");
                    return;
                }
                break;
            case 'command':
                var isCommandChannel = await data.isCommandChannel(msg.guild.id, msg.channel.id);
                var de = "";
                if (isCommandChannel) {
                    de = "de";
                }
                if (await cmds.yesOrNo(msg, "Do you want to " + de + "activate commands in <#" + await msg.channel.id + ">?", "Cancelled " + de + "activating commands in <#" + await msg.channel.id + ">")) {
                    await data.setCommandChannel(msg.guild.id, msg.channel.id, !isCommandChannel);
                    msg.channel.send("Successfully " + de + "activated commands in <#" + await msg.channel.id + ">.");
                }
                break;
            case 'notification':
                var isNotChann = await data.isNotChannel(msg.guild.id, msg.channel.id);
                if (!isNotChann) {
                    if (await cmds.yesOrNo(msg, "Do you want to activate MagiBot notifications in <#" + await msg.channel.id + ">?", "Cancelled activating notifications in <#" + await msg.channel.id + ">")) {
                        await data.setNotification(await msg.guild.id, await msg.channel.id);
                        msg.channel.send("Successfully activated notifications in <#" + await msg.channel.id + ">.").then(mess => { mess.delete(5000).catch(() => { }); msg.delete(); });
                    }
                } else {
                    if (await cmds.yesOrNo(msg, "Do you want to deactivate MagiBot notifications in <#" + await msg.channel.id + ">?", "Cancelled deactivating notifications in <#" + await msg.channel.id + ">")) {
                        await data.setNotification(await msg.guild.id, false);
                        msg.channel.send("Successfully deactivated notifications.");
                    }
                }
                break;
            case "prefix":
                if (mention) {
                    if (await cmds.yesOrNo(msg, "Do you want to change the prefix in " + msg.guild.name + " from `" + bot.PREFIXES[msg.guild.id] + ".` to `" + mention + ".` ?", "Cancelled changing the prefix.")) {
                        let newpref = await data.setPrefixE(msg.guild.id, mention, bot);
                        if (newpref) {
                            msg.channel.send("Successfully changed prefix to `" + newpref + ".` !");
                        } else {
                            msg.channel.send("Something bad happened...");
                        }
                    }
                } else {
                    msg.reply("you need to provide a prefix you want to use.");
                }
                break;
            case "info":
                var info = [];
                var set = await data.getSettings(msg.guild.id);

                info.push({
                    name: "Prefix",
                    value: await data.getPrefixE(msg.guild.id) + ".",
                    inline: false
                });

                let str = "";
                let cmd = set["commandChannels"];
                if (!cmd.toString()) {
                    str = "no whitelist, so every channel is allowed";
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
                        let chann = await guild.channels.get(cmd[s]);
                        if (chann) {
                            str += chann.name + ", ";
                        } else {
                            await data.setJoinable(msg.guild.id, cmd[s], false);
                        }
                    }
                    str = str.substring(0, str.length - 2);
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
                    str = str.substring(0, str.length - 2);
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
                    str = str.substring(0, str.length - 2);
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
                msg.reply("this command doesn't exist. Use `" + bot.PREFIXES[msg.guild.id] + ":help setup` for more info.");
                break;
        }
    },
    help: 'Modify the settings for the bot',
    ehelp: function (msg, bot) { return printHelp(msg, bot); },
    perm: "SEND_MESSAGES",
    admin: true,
    hide: false,
    category: "Utility"
};
