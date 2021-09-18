// commands made by Basti for use of the Bot
import Discord, { MessageActionRow, MessageButton } from 'discord.js';

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
	const user = await guild.members.fetch(mention);
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

export function doNothingOnError() {}

export function returnNullOnError() {
	return null;
}

export const yesOrNoButtonCallbacks = new Map<
  string,
  {
    msg: Discord.Message;
    resolve:(success: boolean) => void;
    abortMessage?: string;
  }
>();

// this is an idea to implement rather reusable confirmation processes.
// ; abortMessage, timeoutMessage and time are optional parameters
export async function yesOrNo(
	msg: Discord.Message,
	question: string,
	abortMessage?: string,
	timeoutMessage?: string,
	timeoutTime?: number,
): Promise<boolean> {
	const row = new MessageActionRow();
	row.addComponents(
		new MessageButton()
			.setCustomId(`${msg.id}-yes`)
			.setLabel('Yes')
			.setStyle('SUCCESS'),
	);
	row.addComponents(
		new MessageButton()
			.setCustomId(`${msg.id}-no`)
			.setLabel('No')
			.setStyle('DANGER'),
	);
	const mess = await msg.channel.send({ content: question, components: [row] });

	const time = timeoutTime || 20000;

	const promise = new Promise<boolean>((resolve) => {
		yesOrNoButtonCallbacks.set(msg.id, {
			msg: mess,
			abortMessage,
			resolve,
		});
		const message = timeoutMessage || 'Cancelled due to timeout.';
		setTimeout(async () => {
			if (yesOrNoButtonCallbacks.has(msg.id)) {
				yesOrNoButtonCallbacks.delete(msg.id);
				await msg.channel.send(message);
			}
			resolve(false);
		}, time);
	});
	return promise;
}

export async function resolveYesOrNoButton(
	interaction: Discord.ButtonInteraction,
) {
	// load info of that button
	// if yes button, resolve with true. else resolve with false
	const idParts = interaction.customId.split('-');
	const isYesButton = idParts[1] === 'yes';
	console.log(isYesButton);
	const id = idParts[0];
	const callbacks = yesOrNoButtonCallbacks.get(id);
	console.log(callbacks);
	if (callbacks) {
		yesOrNoButtonCallbacks.delete(id);
		callbacks.msg.delete();
		if (!isYesButton && callbacks.abortMessage) {
			callbacks.msg.channel
				.send(callbacks.abortMessage)
				.catch(doNothingOnError);
		}
		callbacks.resolve(isYesButton);
	}
}

export function printError(error) {
	console.error(
		`Errorstatus: ${error.response.status} ${error.response.statusText}`,
	);
}

export async function asyncForEach<T, F, O>(
	values: Array<T> | Discord.Collection<string | number, T>,
	callback: (
    input: T,
    index: number | string,
    optionalParams?: O
  ) => Promise<F>,
	optParams?: O,
) {
	if (Array.isArray(values)) {
		const arr = values.map((e, i) => callback(e, i, optParams));
		return Promise.all<F>(arr);
	}
	const arr = values.map((e, i) => callback(e, i, optParams));
	return Promise.all<F>(arr);
}

// unused
export async function asyncForEachFromFlint<T, F, N, O>(
	array: Array<T> | Map<N, T>,
	callback: (input: T, index: number | N, optParams?: O) => Promise<F>,
	optionalParams?: O,
) {
	if (Array.isArray(array)) {
		const arr = array.map((e, i) => callback(e, i, optionalParams));
		return Promise.all<F>(arr);
	}
	const arr: Array<Promise<F>> = [];
	array.forEach((e, i) => arr.push(callback(e, i, optionalParams)));
	return Promise.all<F>(arr);
}

export async function asyncWait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
