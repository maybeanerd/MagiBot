var data = require(__dirname + '/../db.js');


module.exports = {
    main: async function f(bot, msg) {
        var command = msg.content.split(" ")[0];
        msg.content = msg.content.replace(command + " ", ""); //TODO without the space it always gets rid of command maybe fix this later also for salt
        if (command == "help") {
            msg.channel.send("Benutze "+bot.PREFIX+"!sound add [Link zu Audio Datei]. Der Link darf nicht auf eine Website verlinken, sondern muss direkt auf die Datei zeigen. Ein einfacher Weg ist, die Datei über Discord zu verschicken und den Link, der dabei generiert wird zu verwenden. Bisher wird nur .MP3 unterstützt.");
        } else {
                var mention = msg.content.split(" ")[0];
                if (!(mention.startsWith("http")&&mention.endsWith(".mp3"))){
                    msg.channel.send("Du musst schon einen MP3 Sound angeben!");
                    return;
                }
                switch (command) {
                    case 'add':
                    //TODO
                        if(await data.joinsound( msg.author.id,mention)){
                        msg.reply("Du hast erfolgreich deinen Joinsound verändert!");
                        }
                        else{
                        msg.reply("Aaaaaand you failed.");
                        }
                        break;
                    case 'rem':
                        //TODO                   
                        break;
                    default:
                        msg.reply('Dies ist kein gültiger Befehl. Nutze "+bot.PREFIX+"!sound help für mehr Information.');
                        break;
                }           
        }
    },
    help: 'Füge dir einen Joinsound hinzu, der bis zu maximal 5 Sekunden lang ist.',
    admin: false,
    hide: false
};
