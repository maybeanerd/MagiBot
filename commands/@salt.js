var data = require(__dirname + '/../db.js');
var cmds = require(__dirname + '/../bamands.js');

function printHelp(msg, bot) {
    var info = [];

    info.push({
        name: "add <@user|userid|nickname>",
        value: "Report a user for being salty",
    });

    info.push({
        name: "rem <@user|userid|nickname>",
        value: "Remove the oldest salt report of a user",
    });

    info.push({
        name: "clr <@user|userid|nickname>",
        value: "Clear all salt of a user",
    });

    info.push({
        name: "reset",
        value: "Reset all salt of this guild. Use with caution",
    });

    return info;
}

module.exports = {
    main: async function f(bot, msg) {
        const args = msg.content.split(/ +/);
        var command = args[0].toLowerCase();
        if (msg.guild) {
            var mention = args[1];
            let uid = await cmds.findMember(msg.guild, mention);
            if (!(mention && uid)) {
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
                                data.resetSalt(msg.guild);
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
                    if (uid == bot.user.id) {
                        msg.reply("you can't report me!");
                        return;
                    }
                    await data.saltUpAdmin(uid, msg.author.id, msg.guild);
                    msg.channel.send("Successfully reported <@!" + uid + "> for being a salty bitch!");
                    break;
                case 'rem':
                    if (await data.remOldestSalt(uid, msg.guild)) {
                        msg.channel.send("Successfully removed the oldest salt from <@!" + uid + ">!");
                    } else {
                        msg.channel.send("<@!" + uid + "> has no salt that could be removed!");
                    }
                    break;
                case 'clr':
                    await data.clrSalt(uid, msg.guild);
                    msg.channel.send("Successfully cleared all salt from <@!" + uid + ">!");
                    break;
                default:
                    msg.reply("this command doesn't exist. Use `" + bot.PREFIXES[msg.guild.id] + ":help salt` to get more info.");
                    break;
            }
        } else {
            msg.reply("Commands are only available on guilds.");
        }
    },
    help: 'Salt commands for admins',
    ehelp: function (msg, bot) { return printHelp(msg, bot); },
    perm: "SEND_MESSAGES",
    admin: true,
    hide: false,
    category: "Utility"
};
