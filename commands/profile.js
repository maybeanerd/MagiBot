var data = require(__dirname + '/../db.js');

module.exports = {
    main: async function f(bot, msg) {
        if (msg.guild) {
            var id;
            var mention = msg.content.split(" ")[0];
            console.log(mention);
            if (mention.length > 9) {
                if (mention.startsWith('<@!') && mention.endsWith('>')) {
                    id = mention.substr(3).slice(0, -1);
                    console.log(id);
                } else {
                    msg.channel.send("Bitte gib entweder keinen Nutzer an, oder erwähne ihn korrekt.");
                    return;
                }
            } else {
                id = msg.author.id;
            }
            var info = [];
            var salt = await data.getSalt(id);
            var usage = await data.getUsage(id);
            info.push({
                name: "Salzlevel",
                value: salt,
                inline: false
            });
            info.push({
                name: "Bot Nutzung",
                value: usage,
                inline: false
            });
            let embed = {
                color: bot.COLOR,
                description: ("Hier sind ein paar Informationen über " + bot.fetchUser(id).username),
                fields: info,
                footer: {
                    icon_url: bot.fetchUser(id).avatarURL,
                    text: bot.fetchUser(id).username
                }
            }
            msg.channel.send('', { embed });
        } else {
            msg.reply("Dieser Befehl ist nur auf Servern verfügbar.");
        }
    },
    help: 'Information über dich oder den Nutzer, den du erwähnst.',
    admin: false,
    hide: false
};
