module.exports = {
    main: (bot, msg) => {
        var info = [];
        let guilds = bot.guilds.array();

        info.push({
            name: "Number of guilds currently being served",
            value: guilds.length,
            inline: false
        });
        info.push({
            name: "Number of users currently being served",
            value: bot.users.size,
            inline: false
        });


        //uptime calc
        var u = bot.uptime;
        var uptime = "";
        //days
        var x = Math.floor(u / 3600000 / 24);
        if (x > 0) {
            uptime += x + "d : ";
        }
        //hours
        x = Math.floor(u / 3600000) % 24;
        if (x > 0) {
            uptime += x + "h : ";
        }
        //mins
        x = Math.floor(u / 60000) % 60;
        if (x > 0) {
            uptime += x + "m : ";
        }
        //secs
        x = Math.floor(u / 1000) % 60;
        if (x > 0) {
            uptime += x + "s";
        }
        //enbettung in ausgabe
        info.push({
            name: "Time since last restart",
            value: uptime,
            inline: false
        });

        let embed = {
            color: bot.COLOR,
            description: "Some information about the bot:",
            fields: info,
            footer: {
                icon_url: bot.user.avatarURL,
                text: bot.SIGN
            }
        }

        msg.channel.send({ embed });
    },
    ehelp: function (msg, bot) {
        return [{ name: "", value: "Get some stats from the bot." }];
    },
    perm: "SEND_MESSAGES",
    admin: false,
    hide: false,
    category: "Miscellaneous"
};
