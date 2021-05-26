import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import { PREFIXES } from '../shared_assets';
import data from '../db';
import { commandCategories } from '../types/enums';
import { magibotCommand } from '../types/magibot';

function printHelp() {
  const info:Array<{name:string, value:string}> = [];

  info.push({
    name: '<Link to audio file>',
    value: "Setup a joinsound for yourself. The link shouldn't link to a website, but directly to the file.\nOnly .mp3 and .wav are being supported at the moment.",
  });

  info.push({
    name: '(attach soundfile to this command)',
    value: 'Setup a joinsound for yourself. Only .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
  });

  info.push({
    name: 'rem',
    value: 'Remove your joinsound',
  });

  return info;
}

export const sound: magibotCommand = {
  name: 'sound',
  main: async function main(content, msg) {
    if (!msg.guild) {
      return;
    }
    const args = content.split(/ +/);
    const command = args[0].toLowerCase();
    if (command === 'rem') {
      if (await data.addSound(msg.author.id, undefined, msg.guild.id)) {
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

        let snd = await ffprobe(mention, { path: ffprobeStatic.path }).catch(() => { });
        if (!snd) {
          msg.reply(`you need to use a compatible link or upload the file with the command! For more info use \`${PREFIXES[msg.guild.id]}.help sound\``);
          return;
        }
        // eslint-disable-next-line prefer-destructuring
        snd = snd.streams[0];
        if (snd.codec_name !== 'mp3' && snd.codec_name !== 'pcm_s16le' && snd.codec_name !== 'pcm_f32le') {
          msg.reply(`you need to use a compatible file! For more info use \`${PREFIXES[msg.guild.id]}.help sound\``);
          return;
        }
        if (snd.duration > 8) {
          msg.reply("the joinsound you're trying to add is longer than 8 seconds.");
          return;
        }
        if (await data.addSound(msg.author.id, mention, msg.guild.id)) {
          msg.reply('you successfully changed your joinsound!');
        } else {
          msg.reply('Something went wrong...');
        }
      } else {
        msg.reply(`this is not a valid command. If you tried adding a sound, remember to attach the file to the command. Use \`${PREFIXES[msg.guild.id]}.help sound\` for more info.`);
      }
    }
  },
  ehelp() { return printHelp(); },
  admin: false,
  perm: 'SEND_MESSAGES',
  hide: false,
  category: commandCategories.fun,
  dev: false,
};
