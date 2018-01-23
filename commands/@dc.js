module.exports = {
    main: (bot, msg) => {
    //only Owner should be able to shut it down
    if (msg.author.id == bot.OWNERID) {
        msg.channel.send("Shutting down...", "success");
        setTimeout(function () {
            process.exit();
        }, 2000);
        }else{
        msg.channel.send("Nur der Besitzer des Bots, <@"+bot.OWNERID+"> darf mich ausschalten!", "error");
        }

    },
    admin: true,
    help:'Fährt den Bot herunter',
    hide:true
};
