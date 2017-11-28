module.exports = {
    main: function (bot, msg) {
        var stop, diff;
        var start = Date.now();
        msg.channel.send("Pong!").then(function (newMsg) {
            var stop = Date.now();
            var diff = (stop - start);
            newMsg.edit("Pong! \nReaktionszeit: `(" + diff + "ms)`\nWebsocket Ping: `(" + bot.ping + "ms)`");
        });
    },
    help: 'Ping den Bot',
    admin: false,
};
