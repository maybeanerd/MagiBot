var data = require(__dirname + '/../db.js');

module.exports = {
    main: async function (bot, msg) {
        let users = await data.getDBLSubs();
        var str = "There are " + users.length + " users currently subscribed to the DBL vote reminder:\n\n";
        for (let i in users) {
            str += i + ". " + bot.users.get(users[i]["_id"]).username + " - voted: " + users[i]["voted"] + "\n";
        }
        msg.channel.send(str);
    },
    ehelp: function (msg, bot) {
        return [{ name: "", value: "get all users that are subscribed to the dbl reminder." }];
    },
    perm: "SEND_MESSAGES",
    dev: true,
    admin: true,
    hide: true,
    category: "Miscellaneous"
};
