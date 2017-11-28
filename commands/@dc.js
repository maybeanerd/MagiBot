module.exports = {
    main: (bot, msg) => {
    //only Owner should be able to shut it down
    if (msg.author.id == bot.OWNERID) {
        msg.channel.send("Shutting down...", "success");
        setTimeout(function () {
            process.exit();
        }else{
        msg.channel.send("Nur der Besitzer des Bots, <@"+bot.OWNERID+"> darf mich ausschalten!", "error");
        }
        }, 2000);
    },
    hide: true
};
