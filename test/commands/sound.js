var data = require(__dirname + '/../db.js');
var ffprobe = require('ffprobe'),
    ffprobeStatic = require('ffprobe-static');


function printHelp(msg, bot) {
    var info = [];

    info.push({
        name: "add <Link to audio file>",
        value: "Setup a joinsound for yourself. The link shouldn't link to a website, but directly to the file. An easy way to achieve this is by sending the file via Discord and then using the link that is generated.\nOnly .mp3 and .wav are being supported at the moment.\n An example Link created with Discord would be: `https://cdn.discordapp.com/attachments/395966673900929034/415595902011572235/mpfc-15-the-spanish-inquisition.mp3`",
        inline: true
    });

    info.push({
        name: "rem",
        value: "Remove your joinsound",
        inline: true
    });

    let embed = {
        color: bot.COLOR,
        description: "Commands available via the prefix `" + bot.PREFIX + "!sound` :",
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
        const args = msg.content.split(/ +/);
        var command = args[0].toLowerCase();
        var mention = args[1];
        switch (command) {
            case 'add':
                let sound = await ffprobe(mention, { path: ffprobeStatic.path }).catch(() => { });
                if (!sound) {
                    msg.reply("you need to use a compatible link! For more info use `" + bot.PREFIX + "!help sound`");
                    return;
                }
                sound = sound.streams[0];
                if (sound.codec_name != 'mp3' && sound.codec_name != 'wav') {
                    msg.reply("you need to use a compatible link! For more info use `" + bot.PREFIX + "!help sound`");
                    return;
                }
                if (sound.duration > 8) {
                    msg.reply("the joinsound you're trying to add is longer than 8 seconds.");
                    return;
                }
                if (await data.addSound(msg.author.id, mention, msg.guild.id)) {
                    msg.reply("you successfully changed your joinsound!");
                }
                else {
                    msg.reply("Something went wrong...");
                }
                break;
            case 'rem':
                if (await data.addSound(msg.author.id, false, msg.guild.id)) {
                    msg.reply("you successfully removed your joinsound!");
                }
                else {
                    msg.reply("Aaaaaand you failed.");
                }

                break;
            default:
                msg.reply("This is not a valid command. Use `" + bot.PREFIX + "!help sound` for more info.");
                break;
        }
    },
    help: 'Manage your joinsound',
    ehelp: async function (msg, bot) { printHelp(msg, bot); },
    admin: false,
    perm: "SEND_MESSAGES",
    hide: false
};
