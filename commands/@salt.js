﻿var data = require(__dirname + '/../db.js');

function printHelp(msg, bot) {
    var info = [];

    info.push({
        name: "add @User",
        value: "Report a user for being salty",
        inline: true
    });

    info.push({
        name: "rem @User",
        value: "Remove the oldest salt report of a user",
        inline: true
    });

    info.push({
        name: "clr @User",
        value: "Clear all salt of a user",
        inline: true
    });

    info.push({
        name: "reset",
        value: "Reset all salt of this guild. Use with caution",
        inline: true
    });

    let embed = {
        color: bot.COLOR,
        description: "Commands available via the prefix `" + bot.PREFIX + "@salt`:",
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
        if (msg.guild) {
            var mention = args[1];
            if (mention && mention.startsWith('<@') && mention.endsWith('>')) {
                mention = mention.substr(2).slice(0, -1);
                if (mention.startsWith('!')) {
                    mention = mention.substr(1);
                }
            } else {
                if (command == "reset") {
                    msg.channel.send("Do you really want to reset all salt on this server?").then(mess => {
                        const filter = (reaction, user) => {
                            return ((reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id === msg.author.id);
                        };
                        mess.react('☑');
                        mess.react('❌');
                        mess.awaitReactions(filter, { max: 1, time: 20000 }).then(reacts => {
                            mess.delete();
                            if (reacts.first() && reacts.first().emoji.name == '☑') {
                                data.resetSalt(msg.guild.id);
                                msg.channel.send("Successfully reset all salt on **" + msg.guild.name + "**!");
                            } else if (reacts.first()) {
                                msg.channel.send("Successfully canceled salt reset.");
                            }
                        });
                    });
                    return;
                }
                msg.reply("you need to mention a user you want to use this on!");
                return;
            }
            switch (command) {
                case 'add':
                    if (mention == bot.user.id) {
                        msg.reply("you can't report me!");
                        return;
                    }
                    await data.saltUpAdmin(mention, msg.author.id, msg.guild.id);
                    msg.channel.send("Successfully reported <@!" + mention + "> for being a salty bitch!");
                    break;
                case 'rem':
                    if (await data.remOldestSalt(mention, msg.guild.id)) {
                        msg.channel.send("Successfully removed the oldest salt from <@!" + mention + ">!");
                    } else {
                        msg.channel.send("<@!" + mention + "> has no salt that could be removed!");
                    }
                    break;
                case 'clr':
                    await data.clrSalt(mention, msg.guild.id);
                    msg.channel.send("Successfully cleared all salt from <@!" + mention + ">!");
                    break;
                default:
                    msg.reply("this command doesn't exist. Use `" + bot.PREFIX + "@help salt` to get more info.");
                    break;
            }
        } else {
            msg.reply("Commands are only available on guilds.");
        }
    },
    help: 'Salt commands for admins',
    ehelp: async function (msg, bot) { printHelp(msg, bot); },
    perm: "SEND_MESSAGES",
    admin: true,
    hide: false
};
