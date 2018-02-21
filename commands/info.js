module.exports = {
    main: (bot, msg) => {
        var info = [];


        info.push({
            name: "Number of guilds currently being served",
            value: bot.guilds.array().length,
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
            name: "Uptime",
            value: uptime,
            inline: false
        });
        info.push({
            name: "Invite me to your guild!",
            value: "https://goo.gl/RQ7Pdo",
            inline: false
        });
        info.push({
            name: "Official Discord for support, ideas und bug reports",
            value: "https://discord.gg/2Evcf4T",
            inline: false
        });
        info.push({
            name: "Support the bot on Patreon!",
            value: "https://www.patreon.com/MagiBot",
            inline: false
        });
        /*info.push({
            name: "Roadmap und bekannte Bugs",
            value: "https://github.com/T0TProduction/MagiBot/projects/1",
            inline: false
        });*/

        //Entwickler Info
        /*
        info.push({
            name: "Entwickler",
            value: "<@185865492576075776>",
            inline: false
        });
        */


        let embed = {
            color: bot.COLOR,
            description: "Some information about the bot:",
            fields: info,
            footer: {
                icon_url: bot.user.avatarURL,
                text: bot.user.username
            }
        }

        msg.channel.send('', { embed });
    },
    help: 'Get some info about the bot',
    admin: false,
    hide: false
};
