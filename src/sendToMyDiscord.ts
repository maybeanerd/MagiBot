// commands made by Basti for use of the Bot
import Discord from 'discord.js';
import { bot } from './bot';


export function catchErrorOnDiscord(err) {
  try {
    const chann = bot.channels.get('414809410448261132');
    if (chann) {
      (chann as Discord.TextChannel).send(`Caught error: ${err}`);
    }
  } catch (error) {
    console.error(error);
  }
}
