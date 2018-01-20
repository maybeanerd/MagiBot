var data = require(__dirname + '/../db.js');

module.exports = {
    main: async function f(bot, msg) {
        if (msg.guild) {
            var id;
            var mention = msg.content.split(" ")[0];
            if (mention.length > 9) {
                if (mention.startsWith('<@') && mention.endsWith('>')) {
                    id = mention.substr(2).slice(0, -1);
                    if (mention.startsWith('!')) {
                        id = id.substr(1);
                    }
                } else {
                    msg.channel.send("Bitte gib entweder keinen Nutzer an, oder erwähne ihn korrekt.");
                    return;
                }
            } else {
                id = msg.author.id;
            }
            var info = [];
            var salt = await data.getSalt(id, msg.guild.id);
            var usage = await data.getUsage(id, msg.guild.id);
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
            let user = await bot.fetchUser(id);
            let embed = {
                color: bot.COLOR,
                description: ("Hier sind ein paar Informationen über " + user.username),
                fields: info,
                footer: {
                    icon_url: user.avatarURL,
                    text: user.username
                }
            }
            msg.channel.send('', { embed });
        } else {
            msg.reply("Dieser Befehl ist nur auf Servern verfügbar.");
        }
    },
    help: 'Information über dich oder einen anderen Nutzer',
    admin: false,
    hide: false
};
