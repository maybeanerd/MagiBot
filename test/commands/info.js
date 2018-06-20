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
        /*
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
            name: "Uptime",
            value: uptime,
            inline: false
        });
        */
        info.push({
            name: "Links",
            value: "Support me by voting on [discordbots.org](https://discordbots.org/bot/384820232583249921) and [bots.ondiscord.xyz](https://bots.ondiscord.xyz/bots/384820232583249921)!\n(vote reminder via `" + bot.PREFIXES[msg.guild.id] + ".dbl`)\n[Invite me to your guild](https://discordapp.com/oauth2/authorize?client_id=384820232583249921&permissions=8&redirect_uri=https%3A%2F%2Fdiscord.gg%2F2Evcf4T&scope=bot)\n[Official support Discord](https://discord.gg/2Evcf4T)\n[Support me on Patreon](https://www.patreon.com/MagiBot)",
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
        return [{ name: "", value: "Get some info about the bot as well as links to official MagiBot stuff." }];
    },
    perm: "SEND_MESSAGES",
    admin: false,
    hide: false,
    category: "Utility"
};
