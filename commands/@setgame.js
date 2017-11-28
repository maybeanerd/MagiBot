module.exports = {
    main: (bot, msg) => {
            bot.user.setGame(msg.toString());
            bot.sendNotification("Status wurde auf \"" + msg + "\" gesetzt.", "success", msg);
    },
    hide: true
};
