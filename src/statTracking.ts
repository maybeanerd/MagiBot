// following functions are async because the statcord types expect promises

let joinsoundsPlayed = 0;

export async function sendJoinSoundsPlayed() {
	const ret = joinsoundsPlayed;
	joinsoundsPlayed = 0;
	console.log('[Statcord custom stats] Sending joinsounds played:', ret);
	return String(ret);
}

export function playedJoinsound() {
	joinsoundsPlayed++;
	console.log(
		'[Statcord custom stats] Tracking joinsounds played:',
		joinsoundsPlayed,
	);
}

let usersWhoJoinedQueue = 0;

export async function sendUsersWhoJoinedQueue() {
	const ret = usersWhoJoinedQueue;
	usersWhoJoinedQueue = 0;
	console.log('[Statcord custom stats] Sending users joined queue:', ret);
	return String(ret);
}

export function userJoinedQueue() {
	usersWhoJoinedQueue++;
	console.log(
		'[Statcord custom stats] Tracking users joined queue:',
		usersWhoJoinedQueue,
	);
}
