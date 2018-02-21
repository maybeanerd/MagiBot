module.exports = {
    main: (bot, msg) => {
        msg.channel.send("Shutting down...", "success");
        setTimeout(function () {
            process.exit();
        }, 2000);


    },
    admin: true,
    help: 'Shuts the bot down',
    hide: true,
    dev: true
};
