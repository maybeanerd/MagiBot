var data = require(__dirname + '/../db.js');

module.exports = {
    main: async function (bot, msg) {
        let authorID = msg.author.id;
        let hasSubscribed = await data.getDBLE(authorID);
        console.log(hasSubscribed);
        let str = "";
        if (!hasSubscribed) {
            str = "subscribe to";
        } else {
            str = "unsubscribe from";
        }

        msg.channel.send("Do you want to " + str + " the Discord Botlist vote reminder?").then(mess => {
            const filter = (reaction, user) => {
                return ((reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id == authorID);
            };
            mess.react('☑').then(() => {
                mess.react('❌');
            });
            mess.awaitReactions(filter, { max: 1, time: 20000 }).then(reacts => {
                mess.delete();
                if (reacts.first() && reacts.first().emoji.name == '☑') {
                    if (!hasSubscribed) {
                        str = "subscribed to";
                    } else {
                        str = "unsubscribed from";
                    }
                    msg.channel.send("You successfully " + str + " the Discord Botlist vote reminder.");
                    data.toggleDBLE(authorID, !hasSubscribed);
                } else if (reacts.first()) {
                    msg.channel.send("Okay then, no changes applied.");
                    return;
                }
            });
        });
    },
    ehelp: function (msg, bot) {
        msg.channel.send("Use `" + bot.PREFIX + ".dbl` to [un]subscribe from the Discord Bot List vote reminder.");
    },
    help: '[Un]subscribe from the Discord Bot List vote reminder',
    admin: false,
    perm: ["SEND_MESSAGES", "MANAGE_MESSAGES"],
    dev: false
};
