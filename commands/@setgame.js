module.exports = {
    main: (bot, msg) => {
            bot.user.setGame(msg.toString());
            bot.sendNotification("Status wurde auf \"" + msg + "\" gesetzt.", "success", msg);
    },
    help: 'Ändert den Status des Bots',
    admin: true,
};
