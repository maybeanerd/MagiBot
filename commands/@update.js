var data = require(__dirname + '/../db.js');

module.exports = {
    main: async function (bot, msg) {
        data.sendUpdate(msg.content, bot);
        msg.channel.send("Erfolgreich folgende Nachricht versandt:\n" + msg.content);

    },
    admin: true,
    help: 'Schicke ein Update an alle Notification Channel.',
    hide: true,
    dev: true
};
