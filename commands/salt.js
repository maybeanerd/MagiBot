var data = require(__dirname + '/../db.js');

function printHelp(msg, bot) {
    var info = [];

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
                    case 'add':
                        var mention = msg.content.split(" ")[0];
                        if (mention.startsWith('<@!') && mention.endsWith('>')) {
                            mention = mention.substr(3).slice(0, -1);
                            let time = await data.saltUp(mention, msg.author.id, msg.guild.id);
                            console.log(time);
                            if (time == 0) {
                                msg.channel.send("Erfolgreich <@!" + mention + "> für salt reportet!");
                            } else {
                                msg.channel.send("Du kannst <@!" + mention + "> erst in " + (59 - Math.floor((time * 60) % 60)) + " min und " + (60 - Math.floor((time * 60 * 60) % 60)) + " sek wieder für salt reporten!");
                            }
                        } else {
                            msg.channel.send("Du musst schon einen Nutzer angeben, den du reporten willst!");
                        }
                        break;
                    case "top": var salters = await data.topSalt(msg.guild.id);
                        var info = [];
                        for (var i = 0; i < 5; i++) {
                            if (salters[i]) {
                                info.push({
                                    name: (i + 1) + ". Platz mit " + salters[i].salt + " Salz",
                                    value: "<@!" + salters[i].salter + ">",
                                    inline: true
                                });
                            } else { break; }
                        }
                        let embed = {
                            color: 0xffffff,
                            description: "Top 5 Salter des " + msg.guild.name + ":",
                            fields: info,
                            footer: {
                                icon_url: await msg.guild.iconURL,
                                text: await msg.guild.name
                            }
                        }
                        msg.channel.send('', { embed });
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
