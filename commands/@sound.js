var data = require(__dirname + '/../db.js');

function printHelp(msg, bot) {
    var info = [];

    info.push({
        name: "add [Link zu Audio Datei]",
        value: "Richte dir einen Joinsound ein. Der Link darf nicht auf eine Website verlinken, sondern muss direkt auf die Datei zeigen. Ein guter Weg ist, die Datei über Discord zu verschicken und den Link, der dabei generiert wird zu verwenden.Bisher wird nur .MP3 oder .WAV unterstützt. Ein Beispiel Link wäre: `https://cdn.discordapp.com/attachments/386915523524558849/402131512818139146/SoundName.mp3`",
        inline: true
    });

    info.push({
        name: "rem",
        value: "Lösche deinen Joinsound",
        inline: true
    });

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
            if (!(mention.startsWith("http") && (mention.endsWith(".wav") || mention.endsWith(".mp3")))) {
                msg.channel.send("Du musst schon einen kompatiblen Link angeben!");
                return;
            }
            switch (command) {
                case 'add':
                    if (await data.addSound(msg.author.id, mention)) {
                        msg.reply("Du hast erfolgreich deinen Joinsound verändert!");
                    }
                    else {
                        msg.reply("Aaaaaand you failed.");
                    }
                    break;
                case 'rem':
                    if (await data.addSound(msg.author.id, false)) {
                        msg.reply("Du hast erfolgreich deinen Joinsound entfernt!");
                    }
                    else {
                        msg.reply("Aaaaaand you failed.");
                    }
                    break;
                case 'del':
                    if (mention.startsWith('<@!') && mention.endsWith('>')) {
                        mention = mention.substr(3).slice(0, -1);
                        if (await data.addSound(mention, false)) {
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
                    msg.reply("Dies ist kein gültiger Befehl. Nutze " + bot.PREFIX + "!sound help für mehr Information.");
                    break;
            }
        }
    },
    help: 'Füge dir einen Joinsound hinzu, der bis zu maximal 5 Sekunden lang ist.',
    admin: false,
    hide: false
};
