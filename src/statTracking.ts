// following functions are async because the statcord types expect promises

let joinsoundsPlayed = 0;

export async function sendJoinSoundsPlayed() {
	const ret = joinsoundsPlayed;
	joinsoundsPlayed = 0;
	return String(ret);
}

export function playedJoinsound() {
	joinsoundsPlayed++;
}

let usersWhoJoinedQueue = 0;

export async function sendUsersWhoJoinedQueue() {
	const ret = usersWhoJoinedQueue;
	usersWhoJoinedQueue = 0;
	return String(ret);
}

export function userJoinedQueue() {
	usersWhoJoinedQueue++;
}
