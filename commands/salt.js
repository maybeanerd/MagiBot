var data = require(__dirname + '/../db.js');

function printHelp(msg, bot) {
    var info = [];
    info.push({
        name: "info",
        value: "Gibt dir Informationen über deinen Salzgehalt",
        inline: true
    });

    info.push({
        name: "add @User",
        value: "Reporte einen Nutzer fürs salten!",
        inline: true
    });

    let embed = {
        color: bot.COLOR,
        description: "Nutzbare Befehle in der Rubrik salt:",
        fields: info,
        footer: {
            icon_url: bot.user.avatarURL,
            text: bot.user.username
        }
    }

    msg.channel.send('', { embed });
}

module.exports = {
    main: async function f(bot, msg) {
        var command = msg.content.split(" ")[0];
        msg.content = msg.content.replace(command + " ", "");
        if (command == "help") {
            printHelp(msg, bot);
        } else {
            if (msg.guild) {
                switch (command) {
                    case 'info':
                        var info = [];
                        var salt = await data.getSalt(msg.author.id);
                        var usage = await data.getUsage(msg.author.id);
                        info.push({
                            name: "Dein Salz",
                            value: salt,
                            inline: false
                        });
                        info.push({
                            name: "Deine Bot Nutzung",
                            value: usage,
                            inline: false
                        });
                        let embed = {
                            color: bot.COLOR,
                            description: "Hier sind ein paar Informationen über deinen Salzgehalt:",
                            fields: info,
                            footer: {
                                icon_url: msg.author.avatarURL,
                                text: msg.author.username
                            }
                        }
                        msg.channel.send('', { embed });
                        break;
                    case 'add':
                        var mention = msg.content.split(" ")[0];
                        if (mention.startsWith('<@!') && mention.endsWith('>')) {
                            mention = mention.substr(3).slice(0, -1);
                            data.saltUp(msg.author.id, mention);
                            msg.channel.send("Erfolgreich <@!" + mention + "> für salt reportet!");
                        } else {
                            msg.channel.send("Du musst schon einen Nutzer angeben, den du reporten willst!");
                        }
                        break;
                    default:
                        msg.reply('Dies ist kein gültiger Befehl. Nutze k!salt help für mehr Information.');
                        break;
                }
            } else {
                msg.reply("Befehle ausser help sind nur auf Servern verfügbar.");
            }
        }
    },
    help: 'Salz Befehle. Nutze k!salt help für mehr Information',
    admin: false,
    hide: false
};
