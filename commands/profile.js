var data = require(__dirname + '/../db.js');

module.exports = {
    main: async function f(bot, msg) {
        if (msg.guild) {
            var id;
            const args = msg.content.split(/ +/);
            var mention = args[0];
            if (mention.length > 0) {
                if (mention.startsWith('<@') && mention.endsWith('>')) {
                    id = mention.substr(2).slice(0, -1);
                    if (id.startsWith('!')) {
                        id = id.substr(1);
                    }
                } else {
                    msg.reply("mention no user at all to get your own profile or mention a user correctly.");
                    return;
                }
            } else {
                id = msg.author.id;
            }
            var info = [];
            var salt = await data.getSalt(id, msg.guild.id);
            var usage = await data.getUsage(id, msg.guild.id);
            info.push({
                name: "Saltlevel",
                value: salt,
                inline: false
            });
            info.push({
                name: "Bot usage",
                value: usage,
                inline: false
            });
            let user = await bot.fetchUser(id);
            let embed = {
                color: bot.COLOR,
                description: ("Here's some info on " + user.username),
                fields: info,
                footer: {
                    icon_url: user.avatarURL,
                    text: user.username
                }
            }
            msg.channel.send('', { embed });
        } else {
            msg.reply("This command is only available in guilds.");
        }
    },
    help: 'Get some info on yourself or a user you mention',
    admin: false,
    hide: false
};
