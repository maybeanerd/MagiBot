import { ShardingManager } from 'discord.js';
/* import Statcord from 'statcord.js'; */
import configuration from './configuration';
import { syncGlobalCommands } from './commandSync';
/* import {
accumulateJoinsoundsPlayed,
accumulateUsersJoinedQueue,
} from './statTracking'; */

export const TOKEN = configuration.tk;

const manager = new ShardingManager('dist/bot.js', {
  token: TOKEN,
});

// register custom stats
// statcord.registerCustomFieldHandler(1, accumulateJoinsoundsPlayed);
// statcord.registerCustomFieldHandler(2, accumulateUsersJoinedQueue);

/* statcord.on('autopost-start', () => {
  // Emitted when statcord autopost starts
  console.log('[Statcord]: Started autopost');
}); */

manager.on('shardCreate', (shard) => console.log(`Launched shard ${shard.id}`));

manager.spawn();

// sync slash commands
syncGlobalCommands();
