module.exports = {
    main: function (bot, msg) {
        var stop, diff;
        var start = Date.now();
        msg.channel.send("Pong!").then(function (newMsg) {
            var stop = Date.now();
            var diff = (stop - start);
            newMsg.edit("Pong! \nReactiontime: `(" + diff + "ms)`");
        });
    },
    ehelp: function (msg, bot) {
        return [{ name: "", value: "Ping the bot and get the response time." }];
    },
    perm: "SEND_MESSAGES",
    admin: false,
    category: "Utility"
};
