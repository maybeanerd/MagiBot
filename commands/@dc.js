module.exports = {
    main: (bot, msg) => {
        msg.channel.send("Shutting down...", "success");
        setTimeout(function () {
            process.exit();
        }, 2000);


    },
    admin: true,
    help: 'Fährt den Bot herunter',
    hide: true,
    dev: true
};
