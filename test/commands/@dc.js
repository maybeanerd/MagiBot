module.exports = {
    main: (bot, msg) => {
        msg.channel.send("Shutting down...", "success");
        setTimeout(function () {
            process.exit();
        }, 2000);


    },
    admin: true,
    help: 'Shuts the bot down',
    perm: ["SEND_MESSAGES", "MANAGE_GUILD"],
    hide: true,
    dev: true
};
