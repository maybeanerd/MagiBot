var data = require(__dirname + '/../db.js');

module.exports = {
    main: async function (bot, msg) {
        data.sendUpdate(msg.content, bot);
        msg.channel.send("Successfully sent:\n" + msg.content);

    },
    admin: true,
    help: 'Send an update to all notification channels',
    hide: true,
    dev: true
};
