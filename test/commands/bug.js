
module.exports = {
    main: async function (bot, msg) {
        if (!((await msg.content.length) > 0)) {
            msg.reply("you need to add info about the report after the command. Use `" + bot.PREFIXES[msg.guild.id] + ".help bug` to get more info.")
            return;
        }
        msg.channel.send("Do you want to send this bugreport?\n" + msg.content).then(mess => {
            const filter = (reaction, user) => {
                return ((reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id === msg.author.id);
            };
            mess.react('☑');
            mess.react('❌');
            mess.awaitReactions(filter, { max: 1, time: 20000 }).then(reacts => {
                mess.delete();
                if (reacts.first() && reacts.first().emoji.name == '☑') {
                    let chann = bot.channels.get("414809410448261132");
                    chann.send("**Bugreport** by " + msg.author.username + " (<@" + msg.author.id + ">) on server " + msg.guild.name + "( " + msg.guild.id + " ) :\n" + msg.content).then(mes => {
                        msg.channel.send("Succesfully sent bugreport.");
                    });
                } else if (reacts.first()) {
                    msg.channel.send("Successfully canceled bugreport.");
                }
            });
        });
    },
    admin: false,
    help: 'Report a bug concerning MagiBot',
    ehelp: async function (msg, bot) { msg.channel.send("To report a bug use `" + bot.PREFIXES[msg.guild.id] + ".bug <bugreport with information about what you did, what was expected, and what went wrong>`."); },
    perm: "SEND_MESSAGES",
    hide: false,
    dev: false
};
