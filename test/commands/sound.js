const data = require(`${__dirname}/../db.js`);
const ffprobe = require('ffprobe');


const ffprobeStatic = require('ffprobe-static');


function printHelp() {
  const info = [];

  info.push({
    name: '<Link to audio file>',
    value: "Setup a joinsound for yourself. The link shouldn't link to a website, but directly to the file.\nOnly .mp3 and .wav are being supported at the moment."
  });

  info.push({
    name: '(and upload soundfile)',
    value: 'Setup a joinsound for yourself. Only .mp3 and .wav are being supported at the moment.\nRemember to put the command into the message with which you upload your file.'
  });

  info.push({
    name: 'rem',
    value: 'Remove your joinsound'
  });

  return info;
}

module.exports = {
  main: async function main(bot, msg) {
    const args = msg.content.split(/ +/);
    const command = args[0].toLowerCase();
    if (command == 'rem') {
      if (await data.addSound(msg.author.id, false, msg.guild.id)) {
        msg.reply('you successfully removed your joinsound!');
      } else {
        msg.reply('Aaaaaand you failed.');
      }
    } else {
      let mention = args[0];
      const file = msg.attachments.array()[0];
      if (mention || file) {
        if (file) {
          mention = file.url;
        }

        let sound = await ffprobe(mention, { path: ffprobeStatic.path }).catch(() => { });
        if (!sound) {
          msg.reply(`you need to use a compatible link! For more info use \`${bot.PREFIXES[msg.guild.id]}.help sound\``);
          return;
        }
        sound = sound.streams[0];
        if (sound.codec_name != 'mp3' && sound.codec_name != 'pcm_s16le' && sound.codec_name != 'pcm_f32le') {
          msg.reply(`you need to use a compatible file! For more info use \`${bot.PREFIXES[msg.guild.id]}.help sound\``);
          return;
        }
        if (sound.duration > 8) {
          msg.reply("the joinsound you're trying to add is longer than 8 seconds.");
          return;
        }
        if (await data.addSound(msg.author.id, mention, msg.guild.id)) {
          msg.reply('you successfully changed your joinsound!');
        } else {
          msg.reply('Something went wrong...');
        }
      } else {
        msg.reply(`This is not a valid command. Use \`${bot.PREFIXES[msg.guild.id]}.help sound\` for more info.`);
      }
    }
  },
  help: 'Manage your joinsound',
  ehelp(msg, bot) { return printHelp(msg, bot); },
  admin: false,
  perm: 'SEND_MESSAGES',
  hide: false,
  category: 'Fun'
};
