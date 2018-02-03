var data = require(__dirname + '/../db.js');

function printHelp(msg, bot) {
    var info = [];

    info.push({
        name: "add @User",
        value: "Reporte einen Nutzer fürs salten",
        inline: true
    });

    info.push({
        name: "rem @User",
        value: "Lösche den ältesten Salt Eintrag eines Nutzers",
        inline: true
    });

    info.push({
        name: "clr @User",
        value: "Lösche das komplette Salz eines Nutzers",
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
                var mention = msg.content.split(" ")[0];
                if (mention.startsWith('<@') && mention.endsWith('>')) {
                    mention = mention.substr(2).slice(0, -1);
                    if (mention.startsWith('!')) {
                        mention = mention.substr(1);
                    }
                } else {
                    msg.channel.send("Du musst schon einen Nutzer angeben, auf den du das anwenden willst!");
                    return;
                }
                switch (command) {
                    case 'add':
                        await data.saltUpAdmin(mention, msg.author.id, msg.guild.id);
                        msg.channel.send("Erfolgreich <@!" + mention + "> wegen salt reported!");
                        break;
                    case 'rem':
                        if (await data.remOldestSalt(mention, msg.guild.id)) {
                            msg.channel.send("Erfolgreich den ältesten Salt von <@!" + mention + "> entfernt!");
                        } else {
                            msg.channel.send("<@!" + mention + "> hat kein Salt, das gelöscht werden könnte!");
                        }
                        break;
                    case 'clr':
                        await data.clrSalt(mention, msg.guild.id);
                        msg.channel.send("Erfolgreich den Salt von <@!" + mention + "> entfernt!");
                        break;
                    default:
                        msg.reply('Dies ist kein gültiger Befehl. Nutze k@salt help für mehr Information.');
                        break;
                }
            } else {
                msg.reply("Befehle ausser help sind nur auf Servern verfügbar.");
            }
        }
    },
    help: 'Salz Befehle der Admins. Nutze k@salt help für mehr Info',
    admin: true,
    hide: false
};
