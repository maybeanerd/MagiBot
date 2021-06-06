// following functions are async because the statcord types expect promises
import { ShardingManager } from 'discord.js';
import { promises as fsp } from 'fs';
import { asyncForEach, doNothingOnError, returnNullOnError } from './bamands';

// attempt to share data over saved files; unfinished and therefore not used

export async function saveJoinsoundsPlayedOfShard(shardId: number) {
	try {
		const data = await fsp
			.readFile(`/shard-${shardId}-jsplayed`, 'utf8')
			.catch(returnNullOnError);
		let joinsoundsPlayed = data ? Number(data) : 0;
		await fsp.writeFile(
			`/shard-${shardId}-jsplayed`,
			String(++joinsoundsPlayed),
		);
	} catch (e) {
		doNothingOnError();
	}
}
export async function saveUsersWhoJoinedQueue(shardId: number) {
	try {
		const data = await fsp
			.readFile(`/shard-${shardId}-uqueue`, 'utf8')
			.catch(returnNullOnError);
		let usersWhoJoinedQueue = data ? Number(data) : 0;
		await fsp.writeFile(
			`/shard-${shardId}-uqueue`,
			String(++usersWhoJoinedQueue),
		);
	} catch (e) {
		doNothingOnError();
	}
}
async function loadJoinsoundsPlayedOfShard(
	shardId: number,
	dataMap: Map<number, number>,
) {
	try {
		const data = await fsp.readFile(`/shard-${shardId}-jsplayed`, 'utf8');
		await fsp.writeFile(`/shard-${shardId}-jsplayed`, String(0));
		dataMap.set(shardId, Number(data));
	} catch (e) {
		console.error('Error loading shared shard data:', e);
	}
}
async function loadUsersWhoJoinedQueue(
	shardId: number,
	dataMap: Map<number, number>,
) {
	try {
		const data = await fsp.readFile(`/shard-${shardId}-uqueue`, 'utf8');
		await fsp.writeFile(`/shard-${shardId}-uqueue`, String(0));
		dataMap.set(shardId, Number(data));
	} catch (e) {
		console.error('Error loading shared shard data:', e);
	}
}

export async function accumulateJoinsoundsPlayed(manager: ShardingManager) {
	const dataMap = new Map<number, number>();
	await asyncForEach(manager.shards.array(), async (shard) => {
		await loadJoinsoundsPlayedOfShard(shard.id, dataMap);
	});
	let amount = 0;
	dataMap.forEach((val) => {
		amount += val;
	});
	// console.log('joinsounds played:', amount);
	return String(amount);
}
export async function accumulateUsersJoinedQueue(manager: ShardingManager) {
	const dataMap = new Map<number, number>();
	await asyncForEach(manager.shards.array(), async (shard) => {
		await loadUsersWhoJoinedQueue(shard.id, dataMap);
	});
	let amount = 0;
	dataMap.forEach((val) => {
		amount += val;
	});
	// console.log('users joined:', amount);
	return String(amount);
}
