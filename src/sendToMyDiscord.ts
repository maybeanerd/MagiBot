// commands made by Basti for use of the Bot
import Discord from 'discord.js';
import { bot } from './bot';


export async function catchErrorOnDiscord(err) {
  try {
    const chann = await bot.channels.fetch('414809410448261132');
    if (chann) {
      (chann as Discord.TextChannel).send(`Caught error: ${err}`);
    }
  } catch (error) {
    console.error(error);
  }
}
