// commands made by Basti for use of the Bot
import Discord from 'discord.js';

export async function findMember(
	guild: Discord.Guild,
	ment: string,
): Promise<string | null> {
	if (!ment) {
		return null;
	}
	const mention = ment.toLowerCase();
	if (mention.startsWith('<@') && mention.endsWith('>')) {
		let id = mention.slice(2, -1);
		if (id.startsWith('!')) {
			id = id.substr(1);
		}
		return id;
	}
	const user = guild.member(mention);
	if (user) {
		return user.id;
	}
	if (mention.length >= 3) {
		let memberArray = guild.members.cache.filter((memb) => memb.displayName.toLowerCase().startsWith(mention));
		if (memberArray.size === 1) {
			return memberArray.first()!.id;
		}
		if (memberArray.size === 0) {
			memberArray = guild.members.cache.filter((memb) => memb.displayName.toLowerCase().includes(mention));
			if (memberArray.size === 1) {
				return memberArray.first()!.id;
			}
		}
	}
	return null;
}

export async function findRole(guild: Discord.Guild, ment: string) {
	if (!ment) {
		return false;
	}
	const mention = ment.toLowerCase();
	if (mention.startsWith('<@&') && mention.endsWith('>')) {
		const id = mention.substr(3).slice(0, -1);
		return id;
	}
	const role = await guild.roles.fetch(mention);
	if (role) {
		return role.id;
	}
	if (mention.length >= 3) {
		let roleArray = guild.roles.cache.filter((rol) => rol.name.toLowerCase().startsWith(mention));
		if (roleArray.size === 1) {
			return roleArray[0].id;
		}
		if (roleArray.size === 0) {
			roleArray = guild.roles.cache.filter((rol) => rol.name.toLowerCase().includes(mention));
			if (roleArray.size === 1) {
				return roleArray[0].id;
			}
		}
	}
	return false;
}

// this is an idea to implement rather reusable confirmation processes.
// ; abortMessage, timeoutMessage and time are optional parameters
export async function yesOrNo(
	msg: Discord.Message,
	question: string,
	abortMessage?: string,
	timeoutMessage?: string,
	tim?: number,
) {
	const mess = await msg.channel.send(question);

	const filter = (reaction: Discord.MessageReaction, user: Discord.User) => (reaction.emoji.name === '☑' || reaction.emoji.name === '❌')
    && user.id === msg.author.id;
	await mess.react('☑');
	await mess.react('❌');
	let time = tim;
	if (!time) {
		time = 20000;
	}
	const reacts = await mess.awaitReactions(filter, {
		max: 1,
		time,
	});
	mess.delete();
	const firstReacts = reacts.first();
	if (firstReacts && firstReacts.emoji.name === '☑') {
		return true;
	}
	if (firstReacts) {
		if (abortMessage) {
			msg.channel.send(abortMessage).catch(doNothingOnError);
		}
		return false;
	}
	let message = timeoutMessage;
	if (!message) {
		message = 'Cancelled due to timeout.';
	}
	await msg.channel.send(message);
	return false;
}

export function printError(error) {
	console.error(
		`Errorstatus: ${error.response.status} ${error.response.statusText}`,
	);
}

export async function asyncForEach<T, F, O>(
	values: Array<T> | IterableIterator<T>,
	callback: (input: T, index: number, optionalParams?: O) => Promise<F>,
	optParams?: O,
) {
	// TODO validate if this works with iterables
	const valuesArray = values instanceof Array ? values : (Object.values(values) as Array<T>);
	const arr = valuesArray.map((e, i) => callback(e, i, optParams));
	return Promise.all<F>(arr);
}

export function doNothingOnError() {}

export function returnNullOnError() {
	return null;
}
