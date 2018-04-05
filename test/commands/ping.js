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
    help: 'Ping the bot',
    perm: "SEND_MESSAGES",
    admin: false,
};
