var data = require(__dirname + '/../db.js');

module.exports = {
    main: async function (bot, msg) {
        msg.channel.send("Do you want to send the update\n" + msg.content).then(mess => {
            const filter = (reaction, user) => {
                return ((reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id === msg.author.id);
            };
            mess.react('☑');
            mess.react('❌');
            mess.awaitReactions(filter, { max: 1, time: 60000 }).then(reacts => {
                mess.delete();
                if (reacts.first() && reacts.first().emoji.name == '☑') {
                    data.sendUpdate(msg.content, bot);
                    msg.channel.send("Successfully sent:\n" + msg.content);
                } else if (reacts.first()) {
                    msg.channel.send("successfully canceled update");
                }
            });
        });
    },
    admin: true,
    help: 'Send an update to all notification channels',
    hide: true,
    dev: true
};
