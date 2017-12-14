var data = require(__dirname + '/../db.js');

module.exports = {
    main: (bot, msg) => {
        var info = [];


        info.push({
            name: "Dein Salt",
            value: parseInt(data.getUser(msg.author.id).salt),
            inline: false
        });

        info.push({
            name: "Deine Bot Nutzung",
            value: parseInt(data.getUser(msg.author.id).botusage),
            inline: false
        });


        let embed = {
            color: bot.COLOR,
            description: "Hier sind ein paar Informationen über deinen Saltstatus:",
            fields: info,
            footer: {
                icon_url: bot.user.avatarURL,
                text: bot.user.username
            }
        }

        msg.channel.send('', { embed });
    },
    help: 'Gibt dir info über salt',
    admin: false,
    hide: false
};
