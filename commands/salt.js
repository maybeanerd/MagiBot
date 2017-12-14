var data = require(__dirname + '/../db.js');

function printHelp(msg, bot) {
    var info = [];
    info.push({
        name: "info",
        value: "Gibt dir Informationen über deinen Salzgehalt",
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
    main: (bot, msg) => {
    var command = msg.content.split(" ")[0];
        msg.content = msg.content.replace(command + " ", "");
        if (command == "help") {
        printHelp(msg,bot);
        }else{
        if (msg.guild) {
        switch(command){
        case 'info':
        var info = [];
        info.push({
            name: "Dein Salz",
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
            description: "Hier sind ein paar Informationen über deinen Salzgehalt:",
            fields: info,
            footer: {
                icon_url: bot.user.avatarURL,
                text: bot.user.username
            }
        }
        msg.channel.send('', { embed });
        break;
        default:
        msg.reply('Dies ist kein gültiger Befehl. Nutze k!salt help für mehr Information.');
        break;
    }}else{
    msg.reply("Befehle ausser help sind nur auf Servern verfügbar.");
    }
    }
    },
    help: 'Salz Befehle. Nutze k!salt help für mehr Information',
    admin: false,
    hide: false
};
