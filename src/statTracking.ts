// following functions are async because the statcord types expect promises

let joinsoundsPlayed = 0;

export async function sendJoinSoundsPlayed() {
  const ret = joinsoundsPlayed;
  joinsoundsPlayed = 0;
  console.log('js played: ', ret);
  return String(ret);
}

export function playedJoinsound() {
  joinsoundsPlayed++;
}

let usersWhoJoinedQueue = 0;

export async function sendUsersWhoJoinedQueue() {
  const ret = usersWhoJoinedQueue;
  usersWhoJoinedQueue = 0;
  console.log('queued users : ', ret);

  return String(ret);
}

export function userJoinedQueue() {
  usersWhoJoinedQueue++;
}
