module.exports = {
    main: (bot, msg) => {
        if (msg.author.id == bot.OWNERID) {
            bot.user.setGame(msg.toString());
            bot.sendNotification("Status wurde auf \"" + msg + "\" gesetzt.", "success", msg);
        } else {
            bot.sendNotification("Du hast nicht die Berechtigung diesen Befehl zu verwenden.", "error", msg);
        }
    },
    hide: true
};
