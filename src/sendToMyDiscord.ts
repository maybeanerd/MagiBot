// commands made by Basti for use of the Bot
import Discord from 'discord.js';
import { bot } from './bot';

export async function catchErrorOnDiscord(message: string) {
  try {
    const chann = await bot.channels.fetch('414809410448261132');
    if (chann) {
      (chann as Discord.TextChannel).send(message.substring(0, 1950));
      // TODO loop over the whole string length?
    }
  } catch (error) {
    console.error(error);
  }
}
