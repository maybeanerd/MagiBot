var data = require(__dirname + '/../db.js');

function printHelp(msg, bot) {
    var info = [];

    info.push({
        name: "del @User",
        value: "Lösche den Joinsound des erwähnten Nutzers",
        inline: true
    });

    let embed = {
        color: bot.COLOR,
        description: "Nutzbare Befehle in der Rubrik " + bot.PREFIX + "@sound :",
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
        msg.content = msg.content.replace(command + " ", ""); //TODO without the space it always gets rid of command maybe fix this later also for salt
        if (command == "help") {
            printHelp(msg, bot);
        } else {
            var mention = msg.content.split(" ")[0];

            switch (command) {
                case 'del':
                    if (mention.startsWith('<@') && mention.endsWith('>')) {
                        mention = mention.substr(2).slice(0, -1);
                        if (mention.startsWith('!')) {
                            mention = mention.substr(1);
                        }
                        if (await data.addSound(mention, false, msg.guild.id)) {
                            msg.reply("Du hast erfolgreich den Joinsound von <@!" + mention + "> entfernt!");
                        }
                        else {
                            msg.reply("Aaaaaand you failed.");
                        }
                    } else {
                        msg.channel.send("Du musst schon einen Nutzer angeben, auf den du das anwenden willst!");
                        return;
                    }
                    break;
                default:
                    msg.reply("Dies ist kein gültiger Befehl. Nutze " + bot.PREFIX + "@sound help für mehr Information.");
                    break;
            }
        }
    },
    help: 'Füge dir einen Joinsound hinzu, der bis zu maximal 5 Sekunden lang ist.',
    admin: true,
    hide: false
};
