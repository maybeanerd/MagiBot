module.exports = {
    main: (bot, msg) => {
        if (msg.author.id == bot.OWNERID) {
            msg.channel.send("Leaving...", "success");
            setTimeout(function () {
                process.exit();
            }, 2000);

        } else {
            bot.sendNotification("Du hast nicht die Berechtigung diesen Befehl zu verwenden.", "error", msg);
        }
    },
    hide: true
};
