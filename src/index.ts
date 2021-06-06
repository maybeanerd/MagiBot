import { ShardingManager } from 'discord.js';
import Statcord from 'statcord.js';
import configuration from './configuration';
import { sendJoinSoundsPlayed, sendUsersWhoJoinedQueue } from './statTracking';

export const TOKEN = configuration.tk;

const manager = new ShardingManager('dist/bot.js', {
	token: TOKEN,
});

if (!process.env.STATCORD_TOKEN) {
	throw new Error('Statcord token missing!');
}

export const statcord = new Statcord.ShardingClient({
	manager,
	key: process.env.STATCORD_TOKEN,
});

// register custom stats
statcord.registerCustomFieldHandler(1, sendJoinSoundsPlayed);
statcord.registerCustomFieldHandler(2, sendUsersWhoJoinedQueue);

statcord.on('autopost-start', () => {
	// Emitted when statcord autopost starts
	console.log('[Statcord]: Started autopost');
});

manager.on('shardCreate', (shard) => console.log(`Launched shard ${shard.id}`));

manager.spawn();
