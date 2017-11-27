module.exports = {
    main: (bot, msg) => {
        msg.channel.send("Leaving...", "success");
        setTimeout(function () {
            process.exit();
        }, 2000);
    },
    hide: true
};
